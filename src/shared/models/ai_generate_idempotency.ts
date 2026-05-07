import { and, eq, lt } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiGenerateIdempotency } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

const DEFAULT_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

export const AIGenerateIdempotencyStatus = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type AIGenerateIdempotencyRecord =
  typeof aiGenerateIdempotency.$inferSelect;

export type ClaimAIGenerateIdempotencyInput = {
  userId: string;
  scope: string;
  idempotencyKey: string;
  requestHash: string;
  ttlMs?: number;
};

type ClaimAIGenerateIdempotencyResult =
  | {
      kind: 'claimed';
      record: AIGenerateIdempotencyRecord;
    }
  | {
      kind: 'existing';
      record: AIGenerateIdempotencyRecord;
    };

type CompleteAIGenerateIdempotencyInput = {
  userId: string;
  scope: string;
  idempotencyKey: string;
  aiTaskId: string;
  responsePayload: Record<string, unknown>;
  ttlMs?: number;
};

type FailAIGenerateIdempotencyInput = {
  userId: string;
  scope: string;
  idempotencyKey: string;
  errorMessage?: string;
  ttlMs?: number;
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

function toExpiryDate(ttlMs = DEFAULT_IDEMPOTENCY_TTL_MS): Date {
  return new Date(Date.now() + Math.max(1000, ttlMs));
}

function serializeResponsePayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}

export async function cleanupExpiredAIGenerateIdempotencyRecords(
  now = new Date()
) {
  const deleted = await db()
    .delete(aiGenerateIdempotency)
    .where(lt(aiGenerateIdempotency.expiresAt, now))
    .returning({ id: aiGenerateIdempotency.id });

  return deleted.length;
}

export async function claimAIGenerateIdempotency(
  input: ClaimAIGenerateIdempotencyInput
): Promise<ClaimAIGenerateIdempotencyResult> {
  const now = new Date();
  const expiresAt = toExpiryDate(input.ttlMs);

  const [claimed] = await db()
    .insert(aiGenerateIdempotency)
    .values({
      id: getUuid(),
      userId: input.userId,
      scope: input.scope,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      status: AIGenerateIdempotencyStatus.PROCESSING,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();

  if (claimed) {
    return {
      kind: 'claimed',
      record: claimed,
    };
  }

  const [existing] = await db()
    .select()
    .from(aiGenerateIdempotency)
    .where(
      and(
        eq(aiGenerateIdempotency.userId, input.userId),
        eq(aiGenerateIdempotency.scope, input.scope),
        eq(aiGenerateIdempotency.idempotencyKey, input.idempotencyKey)
      )
    );

  if (!existing) {
    const [fallbackClaim] = await db()
      .insert(aiGenerateIdempotency)
      .values({
        id: getUuid(),
        userId: input.userId,
        scope: input.scope,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        status: AIGenerateIdempotencyStatus.PROCESSING,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();

    if (fallbackClaim) {
      return {
        kind: 'claimed',
        record: fallbackClaim,
      };
    }

    const [latestExisting] = await db()
      .select()
      .from(aiGenerateIdempotency)
      .where(
        and(
          eq(aiGenerateIdempotency.userId, input.userId),
          eq(aiGenerateIdempotency.scope, input.scope),
          eq(aiGenerateIdempotency.idempotencyKey, input.idempotencyKey)
        )
      );

    if (!latestExisting) {
      throw new Error(
        'ai_generate_idempotency claim conflict could not load existing record'
      );
    }

    return {
      kind: 'existing',
      record: latestExisting,
    };
  }

  if (existing.expiresAt <= now) {
    const [reclaimed] = await db()
      .update(aiGenerateIdempotency)
      .set({
        requestHash: input.requestHash,
        status: AIGenerateIdempotencyStatus.PROCESSING,
        responsePayload: null,
        aiTaskId: null,
        errorMessage: null,
        expiresAt,
        updatedAt: now,
      })
      .where(eq(aiGenerateIdempotency.id, existing.id))
      .returning();

    if (reclaimed) {
      return {
        kind: 'claimed',
        record: reclaimed,
      };
    }
  }

  return {
    kind: 'existing',
    record: existing,
  };
}

export async function completeAIGenerateIdempotency(
  input: CompleteAIGenerateIdempotencyInput
) {
  const [record] = await db()
    .update(aiGenerateIdempotency)
    .set({
      status: AIGenerateIdempotencyStatus.COMPLETED,
      aiTaskId: input.aiTaskId,
      responsePayload: serializeResponsePayload(input.responsePayload),
      errorMessage: null,
      expiresAt: toExpiryDate(input.ttlMs),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiGenerateIdempotency.userId, input.userId),
        eq(aiGenerateIdempotency.scope, input.scope),
        eq(aiGenerateIdempotency.idempotencyKey, input.idempotencyKey)
      )
    )
    .returning();

  return record || null;
}

export async function failAIGenerateIdempotency(
  input: FailAIGenerateIdempotencyInput
) {
  const [record] = await db()
    .update(aiGenerateIdempotency)
    .set({
      status: AIGenerateIdempotencyStatus.FAILED,
      errorMessage: normalizeText(input.errorMessage, 500),
      expiresAt: toExpiryDate(input.ttlMs),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiGenerateIdempotency.userId, input.userId),
        eq(aiGenerateIdempotency.scope, input.scope),
        eq(aiGenerateIdempotency.idempotencyKey, input.idempotencyKey)
      )
    )
    .returning();

  return record || null;
}
