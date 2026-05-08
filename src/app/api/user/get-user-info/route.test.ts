import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  findUserNotificationPreferenceByUserId: vi.fn(),
  getUserCredits: vi.fn(),
  hasPermission: vi.fn(),
}));

vi.mock('@/shared/lib/api/secure-json-route', () => ({
  createSecurePostRoute: ({
    handler,
  }: {
    handler: (context: {
      request: Request;
      user: { id: string; email: string; name: string };
    }) => Promise<Response>;
  }) => ({
    OPTIONS: vi.fn(),
    POST: (request: Request) =>
      handler({
        request,
        user: {
          id: 'user-1',
          email: 'charlie0simmon@gmail.com',
          name: 'Charlie Simmon',
        },
      }),
  }),
}));

vi.mock('@/shared/models/user', async () => {
  return {
    getUserCredits: mocks.getUserCredits,
  };
});

vi.mock('@/shared/models/credit', () => ({
  getRemainingCredits: vi.fn().mockResolvedValue(12),
}));

vi.mock('@/shared/models/user-notification-preference', () => ({
  findUserNotificationPreferenceByUserId:
    mocks.findUserNotificationPreferenceByUserId,
}));

vi.mock('@/core/rbac', () => ({
  PERMISSIONS: {
    ADMIN_ACCESS: 'admin.access',
  },
}));

vi.mock('@/shared/services/rbac', () => ({
  hasPermission: mocks.hasPermission,
}));

import { POST } from './route';

describe('/api/user/get-user-info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mocks.hasPermission.mockResolvedValue(true);
    mocks.getUserCredits.mockResolvedValue({
      remainingCredits: 12,
      expiresAt: null,
      dailyClaim: {
        claimedToday: false,
        creditsAmount: 15,
      },
    });
  });

  it('keeps admin data available when notification preferences fail to load', async () => {
    mocks.findUserNotificationPreferenceByUserId.mockRejectedValue(
      new Error('relation "mogged_games.user_notification_preference" does not exist')
    );

    const response = await POST(
      new Request('https://example.com/api/user/get-user-info', {
        method: 'POST',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      code: 0,
      data: {
        id: 'user-1',
        isAdmin: true,
        credits: {
          remainingCredits: 12,
          expiresAt: null,
          dailyClaim: {
            claimedToday: false,
            creditsAmount: 15,
          },
        },
        notificationPreferences: {
          aiTaskCompletionEmailEnabled: false,
        },
      },
    });
    expect(mocks.getUserCredits).toHaveBeenCalledWith('user-1', null);
  });

  it('passes the request country to user credit status resolution', async () => {
    const response = await POST(
      new Request('https://example.com/api/user/get-user-info', {
        method: 'POST',
        headers: {
          'cf-ipcountry': 'IN',
        },
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.getUserCredits).toHaveBeenCalledWith('user-1', 'IN');
  });
});
