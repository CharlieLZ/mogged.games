import 'server-only';

import {
  and,
  count,
  desc,
  eq,
  isNull,
  lt,
  or,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, credit, user } from '@/config/db/schema';
import { AITaskStatus } from '@/extensions/ai/types';
import {
  parseDbJsonArray,
  parseDbJsonValue,
  serializeDbJsonValue,
} from '@/shared/lib/db-json';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import { appendUserToResult, type User } from '@/shared/models/user';

import {
  consumeCredits,
  CreditStatus,
  CreditTransactionType,
  scheduleCreditBalanceChangeNotification,
} from './credit';

type StoredAITask = typeof aiTask.$inferSelect;
type StoredNewAITask = typeof aiTask.$inferInsert;

const COMPLETION_NOTIFICATION_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

export type AITask = Omit<
  StoredAITask,
  'options' | 'taskInfo' | 'taskResult'
> & {
  options: unknown | null;
  taskInfo: unknown | null;
  taskResult: unknown | null;
  user?: User;
};

export type NewAITask = Omit<
  StoredNewAITask,
  'options' | 'taskInfo' | 'taskResult'
> & {
  options?: unknown | null;
  taskInfo?: unknown | null;
  taskResult?: unknown | null;
};

export type UpdateAITask = Partial<Omit<NewAITask, 'id' | 'createdAt'>>;

type ConsumedCreditDetailItem = {
  creditId?: string;
  creditsConsumed?: number;
  expiresAt?: Date | string | null;
};

function hasOwnKey<T extends object>(value: T, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isAiTaskMetadataRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildRefundNotificationDescription({
  originalDescription,
  status,
}: {
  originalDescription?: string | null;
  status?: string | null;
}) {
  const normalizedDescription = originalDescription?.trim();
  const reason =
    status === AITaskStatus.CANCELED ? 'task canceled' : 'task failed';

  return normalizedDescription
    ? `Refund after ${reason}: ${normalizedDescription}`
    : `Refund after ${reason}`;
}

function parseOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPositiveCreditAmount(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value;
}

function calculateRefundExpiration({
  sourceExpiresAt,
  consumedAt,
  refundedAt,
}: {
  sourceExpiresAt: unknown;
  consumedAt: Date;
  refundedAt: Date;
}) {
  const parsedExpiresAt = parseOptionalDate(sourceExpiresAt);
  if (!parsedExpiresAt) {
    return null;
  }

  const remainingMsAtConsume = parsedExpiresAt.getTime() - consumedAt.getTime();
  if (!Number.isFinite(remainingMsAtConsume) || remainingMsAtConsume <= 0) {
    return null;
  }

  return new Date(refundedAt.getTime() + remainingMsAtConsume);
}

function buildRefundCreditBuckets({
  consumedCredit,
  refundedAt,
}: {
  consumedCredit: typeof credit.$inferSelect;
  refundedAt: Date;
}) {
  const consumedAt = parseOptionalDate(consumedCredit.createdAt) ?? refundedAt;
  const consumedItems = parseDbJsonArray<ConsumedCreditDetailItem>(
    consumedCredit.consumedDetail
  );
  const buckets = new Map<
    string,
    { credits: number; expiresAt: Date | null }
  >();

  consumedItems.forEach((item) => {
    const creditsConsumed = getPositiveCreditAmount(item?.creditsConsumed);
    if (creditsConsumed <= 0) {
      return;
    }

    const expiresAt = calculateRefundExpiration({
      sourceExpiresAt: item?.expiresAt,
      consumedAt,
      refundedAt,
    });
    const bucketKey = expiresAt?.toISOString() ?? 'never';
    const existingBucket = buckets.get(bucketKey);

    if (existingBucket) {
      existingBucket.credits += creditsConsumed;
      return;
    }

    buckets.set(bucketKey, {
      credits: creditsConsumed,
      expiresAt,
    });
  });

  if (buckets.size === 0) {
    const fallbackCredits = Math.max(0, Math.abs(consumedCredit.credits));
    if (fallbackCredits > 0) {
      buckets.set('never', {
        credits: fallbackCredits,
        expiresAt: null,
      });
    }
  }

  return [...buckets.values()];
}

function serializeAITaskJsonFields<T extends object>(task: T) {
  const serialized: Record<string, unknown> = {
    ...(task as Record<string, unknown>),
  };

  if (hasOwnKey(task, 'options')) {
    serialized.options = serializeDbJsonValue(
      (task as { options?: unknown }).options
    );
  }

  if (hasOwnKey(task, 'taskInfo')) {
    serialized.taskInfo = serializeDbJsonValue(
      (task as { taskInfo?: unknown }).taskInfo
    );
  }

  if (hasOwnKey(task, 'taskResult')) {
    serialized.taskResult = serializeDbJsonValue(
      (task as { taskResult?: unknown }).taskResult
    );
  }

  return serialized;
}

export function normalizeAITaskJsonFields<
  T extends {
    options?: unknown;
    taskInfo?: unknown;
    taskResult?: unknown;
  },
>(
  task: T
): Omit<T, 'options' | 'taskInfo' | 'taskResult'> & {
  options: unknown | null;
  taskInfo: unknown | null;
  taskResult: unknown | null;
} {
  return {
    ...task,
    options: parseDbJsonValue(task.options),
    taskInfo: parseDbJsonValue(task.taskInfo),
    taskResult: parseDbJsonValue(task.taskResult),
  };
}

export async function createAITask(newAITask: NewAITask) {
  const storedNewAITask = serializeAITaskJsonFields(
    newAITask
  ) as StoredNewAITask;

  const { taskResult, consumedCredit } = await db().transaction(async (tx) => {
    const [taskResult] = await tx
      .insert(aiTask)
      .values(storedNewAITask)
      .returning();
    let consumedCredit: Awaited<ReturnType<typeof consumeCredits>> | null =
      null;

    if (newAITask.costCredits && newAITask.costCredits > 0) {
      consumedCredit = await consumeCredits({
        userId: newAITask.userId,
        credits: newAITask.costCredits,
        scene: newAITask.scene,
        description: `generate ${newAITask.mediaType}`,
        metadata: {
          type: 'ai-task',
          mediaType: taskResult.mediaType,
          taskId: taskResult.id,
        },
        tx,
      });

      if (consumedCredit?.id) {
        taskResult.creditId = consumedCredit.id;
        await tx
          .update(aiTask)
          .set({ creditId: consumedCredit.id })
          .where(eq(aiTask.id, taskResult.id));
      }
    }

    return {
      taskResult,
      consumedCredit,
    };
  });

  if (consumedCredit?.id) {
    await scheduleCreditBalanceChangeNotification({
      credit: consumedCredit,
      source: 'ai_generate',
    });
  }

  return normalizeAITaskJsonFields(taskResult);
}

export async function findAITaskById(id: string) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(and(eq(aiTask.id, id), isNull(aiTask.deletedAt)));

  return result ? normalizeAITaskJsonFields(result) : undefined;
}

export async function findAITaskByProviderTaskId({
  provider,
  taskId,
}: {
  provider: string;
  taskId: string;
}) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.provider, provider),
        eq(aiTask.taskId, taskId),
        isNull(aiTask.deletedAt)
      )
    );

  return result ? normalizeAITaskJsonFields(result) : undefined;
}

export async function softDeleteAITaskById({
  id,
  userId,
}: {
  id: string;
  userId?: string;
}) {
  const [result] = await db()
    .update(aiTask)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(aiTask.id, id),
        userId ? eq(aiTask.userId, userId) : undefined,
        isNull(aiTask.deletedAt)
      )
    )
    .returning({ id: aiTask.id });

  return result?.id || null;
}

export async function updateAITaskById(id: string, updateAITask: UpdateAITask) {
  const { updatedTask, refundedCreditChange } = await db().transaction(
    async (tx) => {
      const shouldRefund =
        updateAITask.status === AITaskStatus.FAILED ||
        updateAITask.status === AITaskStatus.CANCELED;
      let creditIdToRefund = updateAITask.creditId;
      let refundedCreditChange: {
        id?: string;
        userId: string;
        userEmail?: string | null;
        orderNo?: string | null;
        subscriptionNo?: string | null;
        transactionNo: string;
        transactionType: string;
        transactionScene?: string | null;
        credits: number;
        description?: string;
        expiresAt?: Date | string | null;
        metadata?: Record<string, unknown> | null;
      } | null = null;

      if (shouldRefund && !creditIdToRefund) {
        const [existingTask] = await tx
          .select({ creditId: aiTask.creditId })
          .from(aiTask)
          .where(eq(aiTask.id, id));
        creditIdToRefund = existingTask?.creditId || undefined;
      }

      if (shouldRefund && creditIdToRefund) {
        const [consumedCredit] = await tx
          .select()
          .from(credit)
          .where(eq(credit.id, creditIdToRefund));

        if (consumedCredit && consumedCredit.status === CreditStatus.ACTIVE) {
          const refundedAt = new Date();
          const refundBuckets = buildRefundCreditBuckets({
            consumedCredit,
            refundedAt,
          });

          const refundDescription = buildRefundNotificationDescription({
            originalDescription: consumedCredit.description,
            status: updateAITask.status,
          });
          const metadata = isAiTaskMetadataRecord(consumedCredit.metadata)
            ? {
                ...consumedCredit.metadata,
              }
            : {};

          metadata.taskId =
            (typeof metadata.taskId === 'string' && metadata.taskId.trim()) ||
            id;
          metadata.refundStatus = updateAITask.status || null;

          const createdRefundCredits: Array<
            typeof credit.$inferInsert & { expiresAt: Date | null }
          > = [];

          for (const refundBucket of refundBuckets) {
            const refundCredit = {
              id: getUuid(),
              userId: consumedCredit.userId,
              userEmail: consumedCredit.userEmail,
              orderNo: consumedCredit.orderNo,
              subscriptionNo: consumedCredit.subscriptionNo,
              transactionNo: getSnowId(),
              transactionType: CreditTransactionType.REFUND,
              transactionScene: consumedCredit.transactionScene,
              credits: refundBucket.credits,
              remainingCredits: refundBucket.credits,
              description: refundDescription,
              expiresAt: refundBucket.expiresAt,
              status: CreditStatus.ACTIVE,
              metadata,
            } satisfies typeof credit.$inferInsert;

            await tx.insert(credit).values(refundCredit);
            createdRefundCredits.push(refundCredit);
          }

          await tx
            .update(credit)
            .set({
              status: CreditStatus.DELETED,
            })
            .where(eq(credit.id, creditIdToRefund));

          const restoredCredits = createdRefundCredits.reduce(
            (total, item) => total + item.credits,
            0
          );
          const primaryRefundCredit = createdRefundCredits[0];

          refundedCreditChange = {
            id: primaryRefundCredit?.id || consumedCredit.id,
            userId: consumedCredit.userId,
            userEmail: consumedCredit.userEmail,
            orderNo: consumedCredit.orderNo,
            subscriptionNo: consumedCredit.subscriptionNo,
            transactionNo:
              primaryRefundCredit?.transactionNo ||
              consumedCredit.transactionNo,
            transactionType: CreditTransactionType.REFUND,
            transactionScene: consumedCredit.transactionScene,
            credits:
              restoredCredits > 0
                ? restoredCredits
                : Math.max(0, Math.abs(consumedCredit.credits)),
            description: refundDescription,
            expiresAt:
              createdRefundCredits.length === 1
                ? (primaryRefundCredit?.expiresAt ?? null)
                : null,
            metadata,
          };
        }
      }

      const serializedUpdateAITask = serializeAITaskJsonFields(
        updateAITask
      ) as Partial<StoredNewAITask>;

      const [updatedTask] = await tx
        .update(aiTask)
        .set(serializedUpdateAITask)
        .where(eq(aiTask.id, id))
        .returning();

      return {
        updatedTask,
        refundedCreditChange,
      };
    }
  );

  if (refundedCreditChange) {
    await scheduleCreditBalanceChangeNotification({
      credit: refundedCreditChange,
      source: 'ai_task_refund',
    });
  }

  return updatedTask ? normalizeAITaskJsonFields(updatedTask) : undefined;
}

export async function claimAITaskCompletionNotificationDelivery(id: string) {
  const now = new Date();
  const expiredClaimBefore = new Date(
    now.getTime() - COMPLETION_NOTIFICATION_CLAIM_TIMEOUT_MS
  );

  const [claimedTask] = await db()
    .update(aiTask)
    .set({
      completionNotificationClaimedAt: now,
      completionNotificationLastAttemptAt: now,
      completionNotificationLastError: null,
    })
    .where(
      and(
        eq(aiTask.id, id),
        eq(aiTask.completionNotificationRequested, true),
        isNull(aiTask.deletedAt),
        isNull(aiTask.completionNotificationSentAt),
        or(
          isNull(aiTask.completionNotificationClaimedAt),
          lt(aiTask.completionNotificationClaimedAt, expiredClaimBefore)
        )
      )
    )
    .returning({ id: aiTask.id });

  return Boolean(claimedTask?.id);
}

export async function markAITaskCompletionNotificationDelivered(
  id: string,
  {
    deliveryProvider,
    messageId,
  }: {
    deliveryProvider?: string | null;
    messageId?: string | null;
  } = {}
) {
  const [updatedTask] = await db()
    .update(aiTask)
    .set({
      completionNotificationClaimedAt: null,
      completionNotificationSentAt: new Date(),
      completionNotificationLastAttemptAt: new Date(),
      completionNotificationLastError: null,
      completionNotificationProvider: deliveryProvider ?? null,
      completionNotificationMessageId: messageId ?? null,
    })
    .where(eq(aiTask.id, id))
    .returning({ id: aiTask.id });

  return Boolean(updatedTask?.id);
}

export async function markAITaskCompletionNotificationFailed(
  id: string,
  {
    errorMessage,
  }: {
    errorMessage?: string | null;
  } = {}
) {
  const [updatedTask] = await db()
    .update(aiTask)
    .set({
      completionNotificationClaimedAt: null,
      completionNotificationLastAttemptAt: new Date(),
      completionNotificationLastError:
        errorMessage?.trim().slice(0, 1000) || null,
    })
    .where(eq(aiTask.id, id))
    .returning({ id: aiTask.id });

  return Boolean(updatedTask?.id);
}

export async function getAITasksCount({
  userId,
  userEmail,
  status,
  mediaType,
  provider,
}: {
  userId?: string;
  userEmail?: string;
  status?: string;
  mediaType?: string;
  provider?: string;
}): Promise<number> {
  let effectiveUserId = userId;

  if (userEmail && !userId) {
    const [foundUser] = await db()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, userEmail));

    if (foundUser) {
      effectiveUserId = foundUser.id;
    } else {
      return 0;
    }
  }

  const [result] = await db()
    .select({ count: count() })
    .from(aiTask)
    .where(
      and(
        effectiveUserId ? eq(aiTask.userId, effectiveUserId) : undefined,
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        provider ? eq(aiTask.provider, provider) : undefined,
        status ? eq(aiTask.status, status) : undefined,
        isNull(aiTask.deletedAt)
      )
    );

  return result?.count || 0;
}

export async function getAITasks({
  userId,
  userEmail,
  status,
  mediaType,
  provider,
  page = 1,
  limit = 30,
  getUser = false,
}: {
  userId?: string;
  userEmail?: string;
  status?: string;
  mediaType?: string;
  provider?: string;
  page?: number;
  limit?: number;
  getUser?: boolean;
}): Promise<AITask[]> {
  let effectiveUserId = userId;

  if (userEmail && !userId) {
    const [foundUser] = await db()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, userEmail));

    if (foundUser) {
      effectiveUserId = foundUser.id;
    } else {
      return [];
    }
  }

  const tasks = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        effectiveUserId ? eq(aiTask.userId, effectiveUserId) : undefined,
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        provider ? eq(aiTask.provider, provider) : undefined,
        status ? eq(aiTask.status, status) : undefined,
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const normalizedTasks = tasks.map((task) => normalizeAITaskJsonFields(task));

  if (getUser) {
    const tasksWithUser = await appendUserToResult(normalizedTasks);
    return tasksWithUser.map((task: AITask) => normalizeAITaskJsonFields(task));
  }

  return normalizedTasks;
}
