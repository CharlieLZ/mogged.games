import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { webhookEvent, webhookEventAttempt } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { RequestContextSnapshot } from '@/shared/lib/request-context';

const DEFAULT_WEBHOOK_PROCESSING_LEASE_MS = 10 * 60 * 1000;

export const WebhookEventStatus = {
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
} as const;

export const WebhookDeliveryStatus = {
  CLAIMED: 'claimed',
  RECLAIMED: 'reclaimed',
  ALREADY_PROCESSED: 'already_processed',
  ALREADY_PROCESSING: 'already_processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
} as const;

export const WebhookAttemptProcessingStatus = {
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export type WebhookEvent = typeof webhookEvent.$inferSelect;
export type WebhookEventAttempt = typeof webhookEventAttempt.$inferSelect;

export type ClaimWebhookEventInput = {
  source: string;
  provider: string;
  eventId: string;
  eventType: string;
  rawEventType?: string | null;
  payload?: string | null;
  requestContext?: Partial<RequestContextSnapshot> | null;
  relatedUserId?: string | null;
  relatedOrderNo?: string | null;
  relatedSubscriptionId?: string | null;
};

export type UpdateWebhookEventInput = {
  source: string;
  provider: string;
  eventId: string;
  attemptId?: string | null;
  relatedUserId?: string | null;
  relatedOrderNo?: string | null;
  relatedSubscriptionId?: string | null;
  errorMessage?: string | null;
  errorStack?: string | null;
};

export type ClaimWebhookEventResult =
  | {
      status: 'claimed';
      record: WebhookEvent;
      attempt: WebhookEventAttempt | null;
    }
  | {
      status: 'already_processed';
      record: WebhookEvent;
      attempt: WebhookEventAttempt | null;
    }
  | {
      status: 'already_processing';
      record: WebhookEvent | null;
      attempt: WebhookEventAttempt | null;
    };

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function getWebhookProcessingLeaseMs(): number {
  const parsed = Number.parseInt(
    process.env.PAYMENT_WEBHOOK_PROCESSING_LEASE_MS || '',
    10
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_WEBHOOK_PROCESSING_LEASE_MS;
}

function resolveRelatedValue(
  nextValue: unknown,
  currentValue: string | null | undefined,
  maxLength: number
) {
  return normalizeText(nextValue, maxLength) || currentValue || null;
}

function buildWebhookBaseUpdate(params: {
  input: ClaimWebhookEventInput;
  existingRecord?: WebhookEvent | null;
  now: Date;
}) {
  return {
    eventType: normalizeText(params.input.eventType, 96) || 'unknown',
    rawEventType: normalizeText(params.input.rawEventType, 128),
    payload: normalizeText(params.input.payload, 200000),
    requestIpAddress: normalizeText(
      params.input.requestContext?.ipAddress,
      64
    ),
    requestUserAgent: normalizeText(
      params.input.requestContext?.userAgent,
      512
    ),
    requestPath: normalizeText(params.input.requestContext?.path, 256),
    relatedUserId: resolveRelatedValue(
      params.input.relatedUserId,
      params.existingRecord?.relatedUserId,
      191
    ),
    relatedOrderNo: resolveRelatedValue(
      params.input.relatedOrderNo,
      params.existingRecord?.relatedOrderNo,
      191
    ),
    relatedSubscriptionId: resolveRelatedValue(
      params.input.relatedSubscriptionId,
      params.existingRecord?.relatedSubscriptionId,
      191
    ),
    lastReceivedAt: params.now,
    updatedAt: params.now,
  };
}

function getAttemptProcessingStatus(deliveryStatus: string) {
  return deliveryStatus === WebhookDeliveryStatus.ALREADY_PROCESSED ||
    deliveryStatus === WebhookDeliveryStatus.ALREADY_PROCESSING
    ? WebhookAttemptProcessingStatus.SKIPPED
    : WebhookAttemptProcessingStatus.PROCESSING;
}

async function createWebhookEventAttempt(params: {
  record: WebhookEvent;
  deliveryStatus: string;
  input: ClaimWebhookEventInput;
  now: Date;
}) {
  const processingStatus = getAttemptProcessingStatus(params.deliveryStatus);

  try {
    const [attempt] = await db()
      .insert(webhookEventAttempt)
      .values({
        id: getUuid(),
        webhookEventId: params.record.id,
        attemptNumber: params.record.deliveryCount,
        deliveryStatus: params.deliveryStatus,
        processingStatus,
        receivedAt: params.now,
        payload: normalizeText(params.input.payload, 200000),
        requestIpAddress: normalizeText(params.input.requestContext?.ipAddress, 64),
        requestUserAgent: normalizeText(
          params.input.requestContext?.userAgent,
          512
        ),
        requestPath: normalizeText(params.input.requestContext?.path, 256),
        processingStartedAt:
          processingStatus === WebhookAttemptProcessingStatus.PROCESSING
            ? params.now
            : null,
        processingFinishedAt:
          processingStatus === WebhookAttemptProcessingStatus.SKIPPED
            ? params.now
            : null,
        processingDurationMs:
          processingStatus === WebhookAttemptProcessingStatus.SKIPPED ? 0 : null,
        errorMessage: null,
        errorStack: null,
        createdAt: params.now,
        updatedAt: params.now,
      })
      .onConflictDoNothing()
      .returning();

    return attempt || null;
  } catch (error) {
    console.warn('[webhook-event] failed to create attempt record', {
      webhookEventId: params.record.id,
      attemptNumber: params.record.deliveryCount,
      deliveryStatus: params.deliveryStatus,
      error,
    });

    return null;
  }
}

async function markWebhookEventAttemptProcessed(input: {
  attemptId?: string | null;
  processingFinishedAt: Date;
  processingDurationMs: number | null;
}) {
  if (!input.attemptId) {
    return null;
  }

  try {
    const [record] = await db()
      .update(webhookEventAttempt)
      .set({
        processingStatus: WebhookAttemptProcessingStatus.PROCESSED,
        processingFinishedAt: input.processingFinishedAt,
        processingDurationMs: input.processingDurationMs,
        errorMessage: null,
        errorStack: null,
        updatedAt: input.processingFinishedAt,
      })
      .where(eq(webhookEventAttempt.id, input.attemptId))
      .returning();

    return record || null;
  } catch (error) {
    console.warn('[webhook-event] failed to mark attempt processed', {
      attemptId: input.attemptId,
      error,
    });

    return null;
  }
}

async function markWebhookEventAttemptFailed(input: {
  attemptId?: string | null;
  processingFinishedAt: Date;
  processingDurationMs: number | null;
  errorMessage?: string | null;
  errorStack?: string | null;
}) {
  if (!input.attemptId) {
    return null;
  }

  try {
    const [record] = await db()
      .update(webhookEventAttempt)
      .set({
        processingStatus: WebhookAttemptProcessingStatus.FAILED,
        processingFinishedAt: input.processingFinishedAt,
        processingDurationMs: input.processingDurationMs,
        errorMessage: normalizeText(input.errorMessage, 1000),
        errorStack: normalizeText(input.errorStack, 50000),
        updatedAt: input.processingFinishedAt,
      })
      .where(eq(webhookEventAttempt.id, input.attemptId))
      .returning();

    return record || null;
  } catch (error) {
    console.warn('[webhook-event] failed to mark attempt failed', {
      attemptId: input.attemptId,
      error,
    });

    return null;
  }
}

async function touchWebhookEventDelivery(params: {
  input: ClaimWebhookEventInput;
  existingRecord?: WebhookEvent | null;
  deliveryStatus: string;
  now: Date;
}) {
  const [record] = await db()
    .update(webhookEvent)
    .set({
      ...buildWebhookBaseUpdate({
        input: params.input,
        existingRecord: params.existingRecord,
        now: params.now,
      }),
      deliveryCount: sql`${webhookEvent.deliveryCount} + 1`,
      lastDeliveryStatus: params.deliveryStatus,
    })
    .where(
      and(
        eq(webhookEvent.source, params.input.source),
        eq(webhookEvent.provider, params.input.provider),
        eq(webhookEvent.eventId, params.input.eventId)
      )
    )
    .returning();

  return record || null;
}

async function findWebhookEventBySourceProviderAndEventId(params: {
  source: string;
  provider: string;
  eventId: string;
}) {
  const [record] = await db()
    .select()
    .from(webhookEvent)
    .where(
      and(
        eq(webhookEvent.source, params.source),
        eq(webhookEvent.provider, params.provider),
        eq(webhookEvent.eventId, params.eventId)
      )
    )
    .limit(1);

  return record || null;
}

export async function claimWebhookEvent(
  input: ClaimWebhookEventInput
): Promise<ClaimWebhookEventResult> {
  const now = new Date();
  const leaseCutoff = new Date(now.getTime() - getWebhookProcessingLeaseMs());

  let existingRecord = await findWebhookEventBySourceProviderAndEventId({
    source: input.source,
    provider: input.provider,
    eventId: input.eventId,
  });

  if (existingRecord?.processedAt) {
    const touchedRecord = await touchWebhookEventDelivery({
      input,
      existingRecord,
      deliveryStatus: WebhookDeliveryStatus.ALREADY_PROCESSED,
      now,
    });
    const record = touchedRecord || existingRecord;
    const attempt = record
      ? await createWebhookEventAttempt({
          record,
          deliveryStatus: WebhookDeliveryStatus.ALREADY_PROCESSED,
          input,
          now,
        })
      : null;

    return {
      status: 'already_processed',
      record,
      attempt,
    };
  }

  if (!existingRecord) {
    const [insertedRecord] = await db()
      .insert(webhookEvent)
      .values({
        id: getUuid(),
        source: normalizeText(input.source, 64) || 'payment',
        provider: normalizeText(input.provider, 32) || 'unknown',
        eventId: normalizeText(input.eventId, 191) || getUuid(),
        eventType: normalizeText(input.eventType, 96) || 'unknown',
        rawEventType: normalizeText(input.rawEventType, 128),
        status: WebhookEventStatus.PROCESSING,
        deliveryCount: 1,
        lastReceivedAt: now,
        lastDeliveryStatus: WebhookDeliveryStatus.CLAIMED,
        payload: normalizeText(input.payload, 200000),
        requestIpAddress: normalizeText(input.requestContext?.ipAddress, 64),
        requestUserAgent: normalizeText(
          input.requestContext?.userAgent,
          512
        ),
        requestPath: normalizeText(input.requestContext?.path, 256),
        relatedUserId: normalizeText(input.relatedUserId, 191),
        relatedOrderNo: normalizeText(input.relatedOrderNo, 191),
        relatedSubscriptionId: normalizeText(
          input.relatedSubscriptionId,
          191
        ),
        processingStartedAt: now,
        lastProcessingStartedAt: now,
        lastProcessingFinishedAt: null,
        lastProcessingDurationMs: null,
        processedAt: null,
        errorMessage: null,
        errorStack: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();

    if (insertedRecord) {
      const attempt = await createWebhookEventAttempt({
        record: insertedRecord,
        deliveryStatus: WebhookDeliveryStatus.CLAIMED,
        input,
        now,
      });

      return {
        status: 'claimed',
        record: insertedRecord,
        attempt,
      };
    }

    existingRecord = await findWebhookEventBySourceProviderAndEventId({
      source: input.source,
      provider: input.provider,
      eventId: input.eventId,
    });
  }

  if (existingRecord?.processedAt) {
    const touchedRecord = await touchWebhookEventDelivery({
      input,
      existingRecord,
      deliveryStatus: WebhookDeliveryStatus.ALREADY_PROCESSED,
      now,
    });
    const record = touchedRecord || existingRecord;
    const attempt = record
      ? await createWebhookEventAttempt({
          record,
          deliveryStatus: WebhookDeliveryStatus.ALREADY_PROCESSED,
          input,
          now,
        })
      : null;

    return {
      status: 'already_processed',
      record,
      attempt,
    };
  }

  const [claimedRecord] = await db()
    .update(webhookEvent)
    .set({
      ...buildWebhookBaseUpdate({
        input,
        existingRecord,
        now,
      }),
      status: WebhookEventStatus.PROCESSING,
      deliveryCount: sql`${webhookEvent.deliveryCount} + 1`,
      lastDeliveryStatus: existingRecord
        ? WebhookDeliveryStatus.RECLAIMED
        : WebhookDeliveryStatus.CLAIMED,
      processingStartedAt: now,
      lastProcessingStartedAt: now,
      lastProcessingFinishedAt: null,
      lastProcessingDurationMs: null,
      processedAt: null,
      errorMessage: null,
      errorStack: null,
    })
    .where(
      and(
        eq(webhookEvent.source, input.source),
        eq(webhookEvent.provider, input.provider),
        eq(webhookEvent.eventId, input.eventId),
        isNull(webhookEvent.processedAt),
        or(
          isNull(webhookEvent.processingStartedAt),
          lt(webhookEvent.processingStartedAt, leaseCutoff)
        )
      )
    )
    .returning();

  if (claimedRecord) {
    const deliveryStatus = existingRecord
      ? WebhookDeliveryStatus.RECLAIMED
      : WebhookDeliveryStatus.CLAIMED;
    const attempt = await createWebhookEventAttempt({
      record: claimedRecord,
      deliveryStatus,
      input,
      now,
    });

    return {
      status: 'claimed',
      record: claimedRecord,
      attempt,
    };
  }

  const currentRecord = await findWebhookEventBySourceProviderAndEventId({
    source: input.source,
    provider: input.provider,
    eventId: input.eventId,
  });

  if (currentRecord?.processedAt) {
    const touchedRecord = await touchWebhookEventDelivery({
      input,
      existingRecord: currentRecord,
      deliveryStatus: WebhookDeliveryStatus.ALREADY_PROCESSED,
      now,
    });
    const record = touchedRecord || currentRecord;
    const attempt = record
      ? await createWebhookEventAttempt({
          record,
          deliveryStatus: WebhookDeliveryStatus.ALREADY_PROCESSED,
          input,
          now,
        })
      : null;

    return {
      status: 'already_processed',
      record,
      attempt,
    };
  }

  const touchedRecord = currentRecord
    ? await touchWebhookEventDelivery({
        input,
        existingRecord: currentRecord,
        deliveryStatus: WebhookDeliveryStatus.ALREADY_PROCESSING,
        now,
      })
    : null;
  const attempt = touchedRecord
    ? await createWebhookEventAttempt({
        record: touchedRecord,
        deliveryStatus: WebhookDeliveryStatus.ALREADY_PROCESSING,
        input,
        now,
      })
    : null;

  return {
    status: 'already_processing',
    record: touchedRecord || currentRecord,
    attempt,
  };
}

export async function markWebhookEventProcessed(
  input: UpdateWebhookEventInput
) {
  const currentRecord = await findWebhookEventBySourceProviderAndEventId({
    source: input.source,
    provider: input.provider,
    eventId: input.eventId,
  });
  const now = new Date();
  const durationMs = currentRecord?.processingStartedAt
    ? Math.max(0, now.getTime() - currentRecord.processingStartedAt.getTime())
    : null;

  const [record] = await db()
    .update(webhookEvent)
    .set({
      status: WebhookEventStatus.PROCESSED,
      lastDeliveryStatus: WebhookDeliveryStatus.PROCESSED,
      relatedUserId: resolveRelatedValue(
        input.relatedUserId,
        currentRecord?.relatedUserId,
        191
      ),
      relatedOrderNo: resolveRelatedValue(
        input.relatedOrderNo,
        currentRecord?.relatedOrderNo,
        191
      ),
      relatedSubscriptionId: resolveRelatedValue(
        input.relatedSubscriptionId,
        currentRecord?.relatedSubscriptionId,
        191
      ),
      processedAt: now,
      processingStartedAt: null,
      lastProcessingFinishedAt: now,
      lastProcessingDurationMs: durationMs,
      errorMessage: null,
      errorStack: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(webhookEvent.source, input.source),
        eq(webhookEvent.provider, input.provider),
        eq(webhookEvent.eventId, input.eventId)
      )
    )
    .returning();

  if (record) {
    await markWebhookEventAttemptProcessed({
      attemptId: input.attemptId,
      processingFinishedAt: now,
      processingDurationMs: durationMs,
    });
  }

  return record || null;
}

export async function markWebhookEventFailed(input: UpdateWebhookEventInput) {
  const currentRecord = await findWebhookEventBySourceProviderAndEventId({
    source: input.source,
    provider: input.provider,
    eventId: input.eventId,
  });
  const now = new Date();
  const durationMs = currentRecord?.processingStartedAt
    ? Math.max(0, now.getTime() - currentRecord.processingStartedAt.getTime())
    : null;

  const [record] = await db()
    .update(webhookEvent)
    .set({
      status: WebhookEventStatus.FAILED,
      lastDeliveryStatus: WebhookDeliveryStatus.FAILED,
      relatedUserId: resolveRelatedValue(
        input.relatedUserId,
        currentRecord?.relatedUserId,
        191
      ),
      relatedOrderNo: resolveRelatedValue(
        input.relatedOrderNo,
        currentRecord?.relatedOrderNo,
        191
      ),
      relatedSubscriptionId: resolveRelatedValue(
        input.relatedSubscriptionId,
        currentRecord?.relatedSubscriptionId,
        191
      ),
      errorMessage: normalizeText(input.errorMessage, 1000),
      errorStack: normalizeText(input.errorStack, 50000),
      processingStartedAt: null,
      lastProcessingFinishedAt: now,
      lastProcessingDurationMs: durationMs,
      processedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(webhookEvent.source, input.source),
        eq(webhookEvent.provider, input.provider),
        eq(webhookEvent.eventId, input.eventId)
      )
    )
    .returning();

  if (record) {
    await markWebhookEventAttemptFailed({
      attemptId: input.attemptId,
      processingFinishedAt: now,
      processingDurationMs: durationMs,
      errorMessage: input.errorMessage,
      errorStack: input.errorStack,
    });
  }

  return record || null;
}

export async function getWebhookEventsByRelatedUserId(
  userId: string,
  limit = 20
) {
  return db()
    .select()
    .from(webhookEvent)
    .where(eq(webhookEvent.relatedUserId, userId))
    .orderBy(desc(webhookEvent.lastReceivedAt), desc(webhookEvent.createdAt))
    .limit(limit);
}

export async function findWebhookEventByIdAndRelatedUserId(params: {
  id: string;
  userId: string;
}) {
  const [record] = await db()
    .select()
    .from(webhookEvent)
    .where(
      and(
        eq(webhookEvent.id, params.id),
        eq(webhookEvent.relatedUserId, params.userId)
      )
    )
    .limit(1);

  return record || null;
}

export async function getWebhookEventAttemptsByWebhookEventId(
  webhookEventId: string,
  limit = 100
) {
  return db()
    .select()
    .from(webhookEventAttempt)
    .where(eq(webhookEventAttempt.webhookEventId, webhookEventId))
    .orderBy(desc(webhookEventAttempt.attemptNumber))
    .limit(limit);
}
