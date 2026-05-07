import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { userNotificationPreference } from '@/config/db/schema';
import { isPostgresUndefinedTableError } from '@/shared/lib/postgres-error';

export type UserNotificationPreference =
  typeof userNotificationPreference.$inferSelect;
export type NewUserNotificationPreference =
  typeof userNotificationPreference.$inferInsert;

const missingPreferenceTableWarnings = new Set<string>();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function warnMissingPreferenceTable(action: string, error: unknown) {
  if (missingPreferenceTableWarnings.has(action)) {
    return;
  }

  missingPreferenceTableWarnings.add(action);

  console.warn('[user-notification-preference] optional table unavailable', {
    action,
    table: 'app.user_notification_preference',
    message: getErrorMessage(error),
  });
}

export async function findUserNotificationPreferenceByUserId(userId: string) {
  try {
    const [result] = await db()
      .select()
      .from(userNotificationPreference)
      .where(eq(userNotificationPreference.userId, userId));

    return result;
  } catch (error) {
    if (!isPostgresUndefinedTableError(error)) {
      throw error;
    }

    warnMissingPreferenceTable('find', error);
    return null;
  }
}

export async function upsertUserNotificationPreference({
  userId,
  aiTaskCompletionEmailEnabled,
}: {
  userId: string;
  aiTaskCompletionEmailEnabled: boolean;
}) {
  try {
    const [result] = await db()
      .insert(userNotificationPreference)
      .values({
        userId,
        aiTaskCompletionEmailEnabled,
      })
      .onConflictDoUpdate({
        target: userNotificationPreference.userId,
        set: {
          aiTaskCompletionEmailEnabled,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  } catch (error) {
    if (!isPostgresUndefinedTableError(error)) {
      throw error;
    }

    warnMissingPreferenceTable('upsert', error);
    return null;
  }
}
