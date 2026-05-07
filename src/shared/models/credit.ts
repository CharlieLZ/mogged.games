import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
  sum,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { credit, user } from '@/config/db/schema';
import { sendCreditsNotification } from '@/extensions/notification';
import { resolveCreditRegionPolicy } from '@/shared/lib/credit-region-policy';
import { getSnowId, getUuid } from '@/shared/lib/hash';

import { getInitialCreditsAmount } from '@/shared/lib/brand';
import { getAllConfigs } from './config';
import { appendUserToResult, User } from './user';

export const DEFAULT_INITIAL_CREDITS_VALID_DAYS = 14;
const SIGNUP_BONUS_TRANSACTION_PREFIX = 'signup_bonus';

export type Credit = typeof credit.$inferSelect & {
  user?: User;
};
export type NewCredit = typeof credit.$inferInsert;
export type UpdateCredit = Partial<
  Omit<NewCredit, 'id' | 'transactionNo' | 'createdAt'>
>;

export enum CreditStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DELETED = 'deleted',
}

export enum CreditTransactionType {
  GRANT = 'grant', // grant credit
  CONSUME = 'consume', // consume credit
  REFUND = 'refund', // refund credit
}

export enum CreditTransactionScene {
  PAYMENT = 'payment', // payment
  SUBSCRIPTION = 'subscription', // subscription
  RENEWAL = 'renewal', // renewal
  GIFT = 'gift', // gift
  REWARD = 'reward', // reward
  DAILY_CLAIM = 'daily_claim', // daily claim
}

const BALANCE_CREDIT_TRANSACTION_TYPES = [
  CreditTransactionType.GRANT,
  CreditTransactionType.REFUND,
];

// Calculate credit expiration time based on order and subscription info
export function calculateCreditExpirationTime({
  creditsValidDays,
  currentPeriodEnd,
}: {
  creditsValidDays: number;
  currentPeriodEnd?: Date;
}): Date | null {
  const now = new Date();

  // Check if credits should never expire
  if (!creditsValidDays || creditsValidDays <= 0) {
    // never expires
    return null;
  }

  const expiresAt = new Date();

  if (currentPeriodEnd) {
    // For subscription: credits expire at the end of current period
    expiresAt.setTime(currentPeriodEnd.getTime());
  } else {
    // For one-time payment: use configured validity days
    expiresAt.setDate(now.getDate() + creditsValidDays);
  }

  return expiresAt;
}

function parseInitialCreditsValidDays(value?: string | null) {
  const parsedDays = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsedDays) && parsedDays > 0
    ? parsedDays
    : DEFAULT_INITIAL_CREDITS_VALID_DAYS;
}

async function findExistingSignupGiftGrant({
  userId,
  description,
}: {
  userId: string;
  description: string;
}) {
  const signupGiftDescriptions = Array.from(
    new Set([
      description,
      'initial credits',
      'initial credits for free trial',
      'Welcome credits',
    ])
  );
  const [existingGrant] = await db()
    .select({ id: credit.id })
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.transactionScene, CreditTransactionScene.GIFT),
        or(
          sql`${credit.metadata}->>'source' = 'signup_bonus'`,
          inArray(credit.description, signupGiftDescriptions)
        ),
        isNull(credit.deletedAt)
      )
    )
    .limit(1);

  return existingGrant;
}

function getSignupGiftTransactionNo(userId: string) {
  return `${SIGNUP_BONUS_TRANSACTION_PREFIX}:${userId}`;
}

async function createSignupGiftCredit(newCredit: NewCredit) {
  const [result] = await db()
    .insert(credit)
    .values(newCredit)
    .onConflictDoNothing({
      target: credit.transactionNo,
    })
    .returning();

  return result;
}

// Helper function to create expiration condition for queries
export function createExpirationCondition() {
  const currentTime = new Date();
  // Credit is valid if: expires_at IS NULL OR expires_at > current_time
  return or(isNull(credit.expiresAt), gt(credit.expiresAt, currentTime));
}

// create credit
export async function createCredit(newCredit: NewCredit) {
  const [result] = await db().insert(credit).values(newCredit).returning();
  return result;
}

export async function findCreditByTransactionNo(transactionNo: string) {
  const [result] = await db()
    .select()
    .from(credit)
    .where(
      and(eq(credit.transactionNo, transactionNo), isNull(credit.deletedAt))
    )
    .limit(1);

  return result;
}

type CreditNotificationContext = {
  locale?: string;
  countryCode?: string;
  regionCode?: string;
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
};

type CreditNotificationChange = {
  id?: string;
  userId: string;
  userEmail?: string | null;
  orderNo?: string | null;
  subscriptionNo?: string | null;
  transactionNo: string;
  transactionType?: string;
  transactionScene?: string | null;
  credits: number;
  description?: string | null;
  expiresAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
};

function isCreditMetadataRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getOptionalNotificationText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getCreditNotificationMetadataSummary(metadata: unknown): {
  metadataType?: string;
  relatedTaskId?: string;
  metadataKeys?: string[];
} {
  if (!isCreditMetadataRecord(metadata)) {
    return {};
  }

  const metadataKeys = Object.keys(metadata)
    .filter(Boolean)
    .sort()
    .slice(0, 12);

  return {
    metadataType: getOptionalNotificationText(metadata.type),
    relatedTaskId: getOptionalNotificationText(metadata.taskId),
    metadataKeys: metadataKeys.length > 0 ? metadataKeys : undefined,
  };
}

export async function scheduleCreditBalanceChangeNotification({
  credit: changedCredit,
  email,
  name,
  source,
  domain,
  context,
}: {
  credit: CreditNotificationChange;
  email?: string;
  name?: string;
  source?: string;
  domain?: string;
  context?: CreditNotificationContext;
}) {
  if (
    !changedCredit.userId ||
    changedCredit.credits === undefined ||
    changedCredit.credits === null ||
    changedCredit.credits === 0
  ) {
    return;
  }

  let balanceAfter: number | undefined;
  let notificationContext = context;
  let resolvedEmail = email || changedCredit.userEmail || undefined;
  let resolvedName = name;

  try {
    balanceAfter = await getRemainingCredits(changedCredit.userId);
  } catch (error) {
    console.warn('[credit] resolve balance for notification failed', {
      userId: changedCredit.userId,
      transactionNo: changedCredit.transactionNo,
      error,
    });
  }

  if (
    !resolvedEmail ||
    !resolvedName ||
    !notificationContext?.locale ||
    !notificationContext?.countryCode ||
    !notificationContext?.regionCode ||
    !notificationContext?.userAgent ||
    !notificationContext?.deviceType
  ) {
    try {
      const [userSnapshot] = await db()
        .select({
          email: user.email,
          name: user.name,
          locale: user.locale,
          countryCode: user.countryCode,
          regionCode: user.regionCode,
          userAgent: user.lastSeenUserAgent,
          deviceType: user.lastDeviceType,
        })
        .from(user)
        .where(eq(user.id, changedCredit.userId))
        .limit(1);

      resolvedEmail = resolvedEmail || userSnapshot?.email || undefined;
      resolvedName = resolvedName || userSnapshot?.name || undefined;
      notificationContext = {
        locale:
          notificationContext?.locale || userSnapshot?.locale || undefined,
        countryCode:
          notificationContext?.countryCode ||
          userSnapshot?.countryCode ||
          undefined,
        regionCode:
          notificationContext?.regionCode ||
          userSnapshot?.regionCode ||
          undefined,
        userAgent:
          notificationContext?.userAgent ||
          userSnapshot?.userAgent ||
          undefined,
        deviceType:
          notificationContext?.deviceType ||
          (userSnapshot?.deviceType as CreditNotificationContext['deviceType']) ||
          undefined,
      };
    } catch (error) {
      console.warn('[credit] resolve user context for notification failed', {
        userId: changedCredit.userId,
        transactionNo: changedCredit.transactionNo,
        error,
      });
    }
  }

  try {
    const metadataSummary = getCreditNotificationMetadataSummary(
      changedCredit.metadata
    );
    const notificationResult = await sendCreditsNotification({
      domain,
      email: resolvedEmail,
      name: resolvedName || undefined,
      userId: changedCredit.userId,
      amount: changedCredit.credits,
      balanceAfter,
      transactionType: changedCredit.transactionType,
      scene: changedCredit.transactionScene || undefined,
      description: changedCredit.description || undefined,
      orderNo: changedCredit.orderNo || undefined,
      subscriptionNo: changedCredit.subscriptionNo || undefined,
      transactionNo: changedCredit.transactionNo,
      creditId: changedCredit.id,
      relatedTaskId: metadataSummary.relatedTaskId,
      metadataType: metadataSummary.metadataType,
      metadataKeys: metadataSummary.metadataKeys,
      expiresAt: changedCredit.expiresAt,
      source,
      locale: notificationContext?.locale,
      countryCode: notificationContext?.countryCode,
      regionCode: notificationContext?.regionCode,
      userAgent: notificationContext?.userAgent,
      deviceType: notificationContext?.deviceType,
      occurredAt: new Date(),
    });

    if (notificationResult.code !== 0) {
      console.warn('[credit] credits notification skipped', {
        userId: changedCredit.userId,
        transactionNo: changedCredit.transactionNo,
        result: notificationResult,
      });
    }
  } catch (error) {
    console.error('[credit] send credit change notification failed', {
      userId: changedCredit.userId,
      transactionNo: changedCredit.transactionNo,
      error,
    });
  }
}

export async function scheduleCreditGrantNotification(params: {
  credit: NewCredit;
  email?: string;
  name?: string;
  source?: string;
  domain?: string;
  context?: CreditNotificationContext;
}) {
  return scheduleCreditBalanceChangeNotification(params);
}

// 付费相关的 scene 列表
export const PAID_SCENES = [
  CreditTransactionScene.PAYMENT,
  CreditTransactionScene.SUBSCRIPTION,
  CreditTransactionScene.RENEWAL,
];

// get credits
export async function getCredits({
  userId,
  status,
  transactionType,
  transactionScene,
  isPaid,
  getUser = false,
  page = 1,
  limit = 30,
  userEmail,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
  transactionScene?: CreditTransactionScene;
  isPaid?: boolean;
  getUser?: boolean;
  page?: number;
  limit?: number;
  userEmail?: string;
}): Promise<Credit[]> {
  let matchedUserIds: string[] | undefined;

  if (userEmail) {
    const matchedUsers = await db()
      .select({ id: user.id })
      .from(user)
      .where(ilike(user.email, `%${userEmail}%`));

    matchedUserIds = matchedUsers.map((item) => item.id);

    if (matchedUserIds.length === 0) {
      return [];
    }
  }

  const result = await db()
    .select()
    .from(credit)
    .where(
      and(
        matchedUserIds ? inArray(credit.userId, matchedUserIds) : undefined,
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined,
        transactionScene
          ? eq(credit.transactionScene, transactionScene)
          : undefined,
        isPaid ? inArray(credit.transactionScene, PAID_SCENES) : undefined,
        isNull(credit.deletedAt)
      )
    )
    .orderBy(desc(credit.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

// get credits count
export async function getCreditsCount({
  userId,
  status,
  transactionType,
  transactionScene,
  isPaid,
  userEmail,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
  transactionScene?: CreditTransactionScene;
  isPaid?: boolean;
  userEmail?: string;
}): Promise<number> {
  let matchedUserIds: string[] | undefined;

  if (userEmail) {
    const matchedUsers = await db()
      .select({ id: user.id })
      .from(user)
      .where(ilike(user.email, `%${userEmail}%`));

    matchedUserIds = matchedUsers.map((item) => item.id);

    if (matchedUserIds.length === 0) {
      return 0;
    }
  }

  const [result] = await db()
    .select({ count: count() })
    .from(credit)
    .where(
      and(
        matchedUserIds ? inArray(credit.userId, matchedUserIds) : undefined,
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined,
        transactionScene
          ? eq(credit.transactionScene, transactionScene)
          : undefined,
        isPaid ? inArray(credit.transactionScene, PAID_SCENES) : undefined,
        isNull(credit.deletedAt)
      )
    );

  return result?.count || 0;
}

export async function revokeUnusedCreditsByOrderNo({
  orderNo,
  reason = 'payment_reversal',
  tx,
}: {
  orderNo: string;
  reason?: string;
  tx?: any;
}) {
  const normalizedOrderNo = orderNo.trim();
  if (!normalizedOrderNo) {
    return 0;
  }

  const now = new Date();

  const execute = async (executor: any) => {
    const [grantCredit] = await executor
      .select()
      .from(credit)
      .where(
        and(
          eq(credit.orderNo, normalizedOrderNo),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          isNull(credit.deletedAt)
        )
      )
      .limit(1);

    if (!grantCredit || grantCredit.remainingCredits <= 0) {
      return 0;
    }

    const revokedCredits = grantCredit.remainingCredits;
    const nextMetadata = {
      ...(isCreditMetadataRecord(grantCredit.metadata)
        ? grantCredit.metadata
        : {}),
      revokedBy: 'payment_webhook',
      revokedReason: reason,
      revokedAt: now.toISOString(),
      revokedCredits,
    };
    const nextDescription = [
      grantCredit.description,
      `Unused credits revoked after ${reason}`,
    ]
      .filter(Boolean)
      .join(' | ');

    await executor
      .update(credit)
      .set({
        remainingCredits: 0,
        status: CreditStatus.EXPIRED,
        expiresAt: now,
        description: nextDescription,
        metadata: nextMetadata,
      })
      .where(eq(credit.id, grantCredit.id));

    return revokedCredits;
  };

  if (tx) {
    return execute(tx);
  }

  return db().transaction(execute);
}

// consume credits
export async function consumeCredits({
  userId,
  credits,
  scene,
  description,
  metadata,
  tx,
}: {
  userId: string;
  credits: number; // credits to consume
  scene?: string;
  description?: string;
  metadata?: Record<string, unknown> | null;
  tx?: any;
}) {
  const currentTime = new Date();

  // consume credits
  const execute = async (tx: any) => {
    // 1. check credits balance
    const [creditsBalance] = await tx
      .select({
        total: sum(credit.remainingCredits),
      })
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          inArray(credit.transactionType, BALANCE_CREDIT_TRANSACTION_TYPES),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0),
          isNull(credit.deletedAt),
          or(
            isNull(credit.expiresAt), // Never expires
            gt(credit.expiresAt, currentTime) // Not yet expired
          )
        )
      );

    // balance is not enough
    if (
      !creditsBalance ||
      !creditsBalance.total ||
      parseInt(creditsBalance.total) < credits
    ) {
      throw new Error(
        `Insufficient credits, ${creditsBalance?.total || 0} < ${credits}`
      );
    }

    // 2. get available credits, FIFO queue with expiresAt, batch query
    let remainingToConsume = credits; // remaining credits to consume

    // only deal with 10000 credit grant records
    let batchNo = 1; // batch no
    const maxBatchNo = 10; // max batch no
    const batchSize = 1000; // batch size
    const consumedItems: any[] = [];
    const plannedUpdates: Array<{
      id: string;
      nextRemainingCredits: number;
    }> = [];
    const plannedCreditIds: string[] = [];

    while (remainingToConsume > 0) {
      if (batchNo > maxBatchNo) {
        throw new Error(`Too many batches: ${batchNo} > ${maxBatchNo}`);
      }

      // get batch credits
      const batchCredits = await tx
        .select()
        .from(credit)
        .where(
          and(
            eq(credit.userId, userId),
            inArray(credit.transactionType, BALANCE_CREDIT_TRANSACTION_TYPES),
            eq(credit.status, CreditStatus.ACTIVE),
            gt(credit.remainingCredits, 0),
            isNull(credit.deletedAt),
            plannedCreditIds.length > 0
              ? notInArray(credit.id, plannedCreditIds)
              : undefined,
            or(
              isNull(credit.expiresAt), // Never expires
              gt(credit.expiresAt, currentTime) // Not yet expired
            )
          )
        )
        .orderBy(
          // FIFO queue: expired credits first, then by expiration date
          // NULL values (never expires) will be ordered last
          asc(credit.expiresAt)
        )
        .limit(batchSize) // batch size
        .for('update'); // lock for update

      // no more credits
      if (batchCredits?.length === 0) {
        break;
      }

      // consume credits for each item
      for (const item of batchCredits) {
        // no need to consume more
        if (remainingToConsume <= 0) {
          break;
        }
        const toConsume = Math.min(remainingToConsume, item.remainingCredits);
        const nextRemainingCredits = item.remainingCredits - toConsume;

        plannedCreditIds.push(item.id);
        plannedUpdates.push({
          id: item.id,
          nextRemainingCredits,
        });

        // update consumed items
        consumedItems.push({
          creditId: item.id,
          transactionNo: item.transactionNo,
          expiresAt: item.expiresAt,
          creditsToConsume: remainingToConsume,
          creditsConsumed: toConsume,
          creditsBefore: item.remainingCredits,
          creditsAfter: nextRemainingCredits,
          batchSize: batchSize,
          batchNo: batchNo,
        });

        remainingToConsume -= toConsume;
      }

      batchNo += 1;
    }

    if (remainingToConsume > 0) {
      const consumedCredits = credits - remainingToConsume;
      throw new Error(
        `Insufficient credits after locking grants, ${consumedCredits} < ${credits}`
      );
    }

    for (const update of plannedUpdates) {
      await tx
        .update(credit)
        .set({ remainingCredits: update.nextRemainingCredits })
        .where(eq(credit.id, update.id));
    }

    // 3. create consumed credit
    const consumedCredit: NewCredit = {
      id: getUuid(),
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.CONSUME,
      transactionScene: scene,
      userId: userId,
      status: CreditStatus.ACTIVE,
      description: description,
      credits: -credits,
      consumedDetail: consumedItems,
      metadata: metadata,
    };
    await tx.insert(credit).values(consumedCredit);

    return consumedCredit;
  };

  // use provided transaction
  if (tx) {
    return await execute(tx);
  }

  // use default transaction
  const consumedCredit = await db().transaction(execute);

  await scheduleCreditBalanceChangeNotification({
    credit: consumedCredit,
    source: 'consume_credits',
  });

  return consumedCredit;
}

// get remaining credits
export async function getRemainingCredits(userId: string): Promise<number> {
  const currentTime = new Date();

  const [result] = await db()
    .select({
      total: sum(credit.remainingCredits),
    })
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        inArray(credit.transactionType, BALANCE_CREDIT_TRANSACTION_TYPES),
        eq(credit.status, CreditStatus.ACTIVE),
        gt(credit.remainingCredits, 0),
        isNull(credit.deletedAt),
        or(
          isNull(credit.expiresAt), // Never expires
          gt(credit.expiresAt, currentTime) // Not yet expired
        )
      )
    );

  return parseInt(result?.total || '0');
}

// get remaining credits for multiple users (batch query to avoid N+1)
export async function getRemainingCreditsBatch(
  userIds: string[]
): Promise<Map<string, number>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const currentTime = new Date();

  const results = await db()
    .select({
      userId: credit.userId,
      total: sum(credit.remainingCredits),
    })
    .from(credit)
    .where(
      and(
        inArray(credit.userId, userIds),
        inArray(credit.transactionType, BALANCE_CREDIT_TRANSACTION_TYPES),
        eq(credit.status, CreditStatus.ACTIVE),
        gt(credit.remainingCredits, 0),
        isNull(credit.deletedAt),
        or(
          isNull(credit.expiresAt), // Never expires
          gt(credit.expiresAt, currentTime) // Not yet expired
        )
      )
    )
    .groupBy(credit.userId);

  const creditsMap = new Map<string, number>();
  // Initialize all userIds with 0
  userIds.forEach((id) => creditsMap.set(id, 0));
  // Update with actual values
  results.forEach((r) => {
    creditsMap.set(r.userId, parseInt(r.total || '0'));
  });

  return creditsMap;
}

// grant credits for new user
export async function grantCreditsForNewUser(
  user: (Pick<User, 'id' | 'email'> & Partial<User>) & {
    requestContext?: CreditNotificationContext;
  }
) {
  // get configs from db
  const configs = await getAllConfigs();

  // if initial credits enabled
  if (configs.initial_credits_enabled !== 'true') {
    return;
  }

  // get initial credits amount and valid days
  const credits = getInitialCreditsAmount({
    initial_credits_amount: configs.initial_credits_amount,
  });
  if (credits <= 0) {
    return;
  }

  if (!user.email) {
    return;
  }

  const regionPolicy = resolveCreditRegionPolicy({
    countryCode: user.requestContext?.countryCode,
    signupBonusCredits: credits,
  });
  const signupBonusCredits = regionPolicy.signupBonusCredits;
  if (signupBonusCredits <= 0) {
    return;
  }

  const creditsValidDays = parseInitialCreditsValidDays(
    configs.initial_credits_valid_days as string
  );

  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays: creditsValidDays,
  });

  const description = configs.initial_credits_description || 'initial credits';

  const existingGrant = await findExistingSignupGiftGrant({
    userId: user.id,
    description,
  });
  if (existingGrant) {
    return;
  }

  const newCredit: NewCredit = {
    id: getUuid(),
    userId: user.id,
    userEmail: user.email,
    orderNo: '',
    subscriptionNo: '',
    transactionNo: getSignupGiftTransactionNo(user.id),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: CreditTransactionScene.GIFT,
    credits: signupBonusCredits,
    remainingCredits: signupBonusCredits,
    description: description,
    expiresAt: expiresAt,
    status: CreditStatus.ACTIVE,
    metadata: {
      source: 'signup_bonus',
    },
  };

  const createdCredit = await createSignupGiftCredit(newCredit);
  if (!createdCredit) {
    return;
  }

  await scheduleCreditGrantNotification({
    credit: newCredit,
    email: user.email,
    name: user.name || undefined,
    source: 'signup_bonus',
    context: user.requestContext,
  });

  return newCredit;
}
