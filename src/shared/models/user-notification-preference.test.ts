import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findUserNotificationPreferenceByUserId,
  upsertUserNotificationPreference,
} from './user-notification-preference';

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
}));

vi.mock('@/core/db', () => ({
  db: mocks.db,
}));

function createUndefinedTableError(tableName: string) {
  return Object.assign(new Error(`relation "${tableName}" does not exist`), {
    code: '42P01',
  });
}

function createWrappedUndefinedTableError(tableName: string) {
  return Object.assign(new Error(`Failed query for ${tableName}`), {
    cause: createUndefinedTableError(tableName),
  });
}

describe('user notification preference model', () => {
  beforeEach(() => {
    mocks.db.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when the notification preference table migration is missing', async () => {
    const where = vi
      .fn()
      .mockRejectedValue(
        createUndefinedTableError('app.user_notification_preference')
      );

    mocks.db.mockReturnValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where,
        })),
      })),
    });

    await expect(
      findUserNotificationPreferenceByUserId('user-1')
    ).resolves.toBeNull();
  });

  it('returns null when saving preferences before the migration is applied', async () => {
    const returning = vi
      .fn()
      .mockRejectedValue(
        createUndefinedTableError('app.user_notification_preference')
      );

    mocks.db.mockReturnValue({
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(() => ({
            returning,
          })),
        })),
      })),
    });

    await expect(
      upsertUserNotificationPreference({
        userId: 'user-1',
        aiTaskCompletionEmailEnabled: true,
      })
    ).resolves.toBeNull();
  });

  it('returns null when the query error is wrapped by the database driver', async () => {
    const where = vi
      .fn()
      .mockRejectedValue(
        createWrappedUndefinedTableError('app.user_notification_preference')
      );

    mocks.db.mockReturnValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where,
        })),
      })),
    });

    await expect(
      findUserNotificationPreferenceByUserId('user-1')
    ).resolves.toBeNull();
  });
});
