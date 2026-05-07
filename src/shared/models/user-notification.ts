import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { userNotification } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { isPostgresUndefinedTableError } from '@/shared/lib/postgres-error';
import {
  normalizeJsonbInput,
  parseDbJsonValue,
} from '@/shared/lib/db-json';

export type UserNotification = typeof userNotification.$inferSelect & {
  payload: Record<string, unknown> | null;
};

type NewUserNotification = {
  id?: string;
  userId: string;
  type: string;
  sourceType: string;
  sourceId: string;
  dedupeKey: string;
  payload?: Record<string, unknown> | null;
};

const missingUserNotificationTableWarnings = new Set<string>();

function normalizeUserNotificationPayload(value: unknown) {
  return parseDbJsonValue<Record<string, unknown> | null>(value);
}

function normalizeUserNotification<T extends { payload?: unknown }>(value: T) {
  return {
    ...value,
    payload: normalizeUserNotificationPayload(value.payload),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function warnMissingUserNotificationTable(action: string, error: unknown) {
  if (missingUserNotificationTableWarnings.has(action)) {
    return;
  }

  missingUserNotificationTableWarnings.add(action);

  console.warn('[user-notification] optional table unavailable', {
    action,
    table: 'app.user_notification',
    message: getErrorMessage(error),
  });
}

export async function upsertUserNotification(input: NewUserNotification) {
  try {
    const [result] = await db()
      .insert(userNotification)
      .values({
        id: input.id || getUuid(),
        userId: input.userId,
        type: input.type,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        dedupeKey: input.dedupeKey,
        payload: normalizeJsonbInput(input.payload ?? null),
      })
      .onConflictDoUpdate({
        target: userNotification.dedupeKey,
        set: {
          type: input.type,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          payload: normalizeJsonbInput(input.payload ?? null),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result ? normalizeUserNotification(result) : null;
  } catch (error) {
    if (!isPostgresUndefinedTableError(error)) {
      throw error;
    }

    warnMissingUserNotificationTable('upsert', error);
    return null;
  }
}

export async function getUserNotifications({
  userId,
  limit = 20,
  page = 1,
}: {
  userId: string;
  limit?: number;
  page?: number;
}) {
  try {
    const results = await db()
      .select()
      .from(userNotification)
      .where(eq(userNotification.userId, userId))
      .orderBy(desc(userNotification.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return results.map(normalizeUserNotification);
  } catch (error) {
    if (!isPostgresUndefinedTableError(error)) {
      throw error;
    }

    warnMissingUserNotificationTable('list', error);
    return [];
  }
}

export async function getUserNotificationsCount(userId: string) {
  try {
    const [result] = await db()
      .select({
        count: count(),
      })
      .from(userNotification)
      .where(eq(userNotification.userId, userId));

    return result?.count || 0;
  } catch (error) {
    if (!isPostgresUndefinedTableError(error)) {
      throw error;
    }

    warnMissingUserNotificationTable('count', error);
    return 0;
  }
}

export async function countUnreadUserNotifications(userId: string) {
  try {
    const [result] = await db()
      .select({
        count: count(),
      })
      .from(userNotification)
      .where(
        and(eq(userNotification.userId, userId), isNull(userNotification.readAt))
      );

    return result?.count || 0;
  } catch (error) {
    if (!isPostgresUndefinedTableError(error)) {
      throw error;
    }

    warnMissingUserNotificationTable('count-unread', error);
    return 0;
  }
}

export async function markUserNotificationsRead({
  userId,
  notificationIds,
}: {
  userId: string;
  notificationIds: string[];
}) {
  if (!notificationIds.length) {
    return 0;
  }

  try {
    const result = await db()
      .update(userNotification)
      .set({
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userNotification.userId, userId),
          inArray(userNotification.id, notificationIds),
          isNull(userNotification.readAt)
        )
      )
      .returning({
        id: userNotification.id,
      });

    return result.length;
  } catch (error) {
    if (!isPostgresUndefinedTableError(error)) {
      throw error;
    }

    warnMissingUserNotificationTable('mark-read', error);
    return 0;
  }
}
