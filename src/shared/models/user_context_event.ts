import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { user, userContextEvent } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

type ContextMetadata = Record<string, unknown> | null | undefined;

export type UserContextEvent = typeof userContextEvent.$inferSelect;

export type RecordUserContextEventInput = {
  userId: string;
  eventType: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceType?: string | null;
  locale?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
  path?: string | null;
  referer?: string | null;
  metadata?: ContextMetadata;
  occurredAt?: Date;
  markSignIn?: boolean;
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

function serializeMetadata(metadata?: ContextMetadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  return metadata;
}

export async function recordUserContextEvent(
  input: RecordUserContextEventInput
) {
  const occurredAt = input.occurredAt || new Date();

  const result = await db().transaction(async (tx) => {
    const [createdEvent] = await tx
      .insert(userContextEvent)
      .values({
        id: getUuid(),
        userId: input.userId,
        eventType: normalizeText(input.eventType, 64) || 'unknown',
        ipAddress: normalizeText(input.ipAddress, 64),
        userAgent: normalizeText(input.userAgent, 512),
        deviceType: normalizeText(input.deviceType, 24),
        locale: normalizeText(input.locale, 12),
        countryCode: normalizeText(input.countryCode, 8),
        regionCode: normalizeText(input.regionCode, 16),
        path: normalizeText(input.path, 256),
        referer: normalizeText(input.referer, 512),
        metadata: serializeMetadata(input.metadata),
        createdAt: occurredAt,
      })
      .returning();

    await tx
      .update(user)
      .set({
        lastSeenAt: occurredAt,
        ...(normalizeText(input.ipAddress, 64)
          ? { lastSeenIpAddress: normalizeText(input.ipAddress, 64) }
          : {}),
        ...(normalizeText(input.userAgent, 512)
          ? { lastSeenUserAgent: normalizeText(input.userAgent, 512) }
          : {}),
        ...(normalizeText(input.deviceType, 24)
          ? { lastDeviceType: normalizeText(input.deviceType, 24) }
          : {}),
        ...(normalizeText(input.locale, 12)
          ? { locale: normalizeText(input.locale, 12) }
          : {}),
        ...(normalizeText(input.countryCode, 8)
          ? { countryCode: normalizeText(input.countryCode, 8) }
          : {}),
        ...(normalizeText(input.regionCode, 16)
          ? { regionCode: normalizeText(input.regionCode, 16) }
          : {}),
        ...(input.markSignIn ? { lastSignInAt: occurredAt } : {}),
      })
      .where(eq(user.id, input.userId));

    return createdEvent;
  });

  return result;
}

export async function safeRecordUserContextEvent(
  input: RecordUserContextEventInput
) {
  try {
    return await recordUserContextEvent(input);
  } catch (error) {
    console.warn('[user-context] failed to record user context event', {
      userId: input.userId,
      eventType: input.eventType,
      error,
    });
    return null;
  }
}

export async function getUserContextEventsByUserId(userId: string, limit = 20) {
  return db()
    .select()
    .from(userContextEvent)
    .where(eq(userContextEvent.userId, userId))
    .orderBy(desc(userContextEvent.createdAt))
    .limit(limit);
}

export async function getLatestUserContextEventByType(
  userId: string,
  eventType: string
) {
  const [result] = await db()
    .select()
    .from(userContextEvent)
    .where(
      and(
        eq(userContextEvent.userId, userId),
        eq(userContextEvent.eventType, eventType)
      )
    )
    .orderBy(desc(userContextEvent.createdAt))
    .limit(1);

  return result || null;
}

export async function hasUserContextEventByType(
  userId: string,
  eventType: string
) {
  const [result] = await db()
    .select({ id: userContextEvent.id })
    .from(userContextEvent)
    .where(
      and(
        eq(userContextEvent.userId, userId),
        eq(userContextEvent.eventType, eventType)
      )
    )
    .limit(1);

  return !!result?.id;
}
