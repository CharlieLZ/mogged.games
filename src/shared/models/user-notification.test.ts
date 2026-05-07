import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  countUnreadUserNotifications,
  getUserNotifications,
  getUserNotificationsCount,
  markUserNotificationsRead,
  upsertUserNotification,
} from './user-notification';

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
}));

vi.mock('@/core/db', () => ({
  db: mocks.db,
}));

vi.mock('@/shared/lib/hash', () => ({
  getUuid: () => 'notification-1',
}));

function createUndefinedTableError(tableName: string) {
  return Object.assign(new Error(`relation "${tableName}" does not exist`), {
    code: '42P01',
  });
}

describe('user notification model', () => {
  beforeEach(() => {
    mocks.db.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty list when the notifications table migration is missing', async () => {
    const offset = vi
      .fn()
      .mockRejectedValue(createUndefinedTableError('app.user_notification'));

    mocks.db.mockReturnValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset,
              })),
            })),
          })),
        })),
      })),
    });

    await expect(
      getUserNotifications({ userId: 'user-1' })
    ).resolves.toEqual([]);
  });

  it('returns zero counters when the notifications table migration is missing', async () => {
    const where = vi
      .fn()
      .mockRejectedValue(createUndefinedTableError('app.user_notification'));

    mocks.db.mockReturnValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where,
        })),
      })),
    });

    await expect(getUserNotificationsCount('user-1')).resolves.toBe(0);
    await expect(countUnreadUserNotifications('user-1')).resolves.toBe(0);
  });

  it('skips writes when the notifications table migration is missing', async () => {
    const returning = vi
      .fn()
      .mockRejectedValue(createUndefinedTableError('app.user_notification'));

    mocks.db.mockReturnValue({
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(() => ({
            returning,
          })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning,
          })),
        })),
      })),
    });

    await expect(
      upsertUserNotification({
        userId: 'user-1',
        type: 'ai_task_completed',
        sourceType: 'ai_task',
        sourceId: 'task-1',
        dedupeKey: 'ai-task:task-1:success',
      })
    ).resolves.toBeNull();

    await expect(
      markUserNotificationsRead({
        userId: 'user-1',
        notificationIds: ['notification-1'],
      })
    ).resolves.toBe(0);
  });
});
