import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  countUnreadUserNotifications: vi.fn(),
}));

vi.mock('@/shared/lib/api/secure-json-route', () => ({
  createSecurePostRoute: ({
    handler,
  }: {
    handler: (context: {
      request: Request;
      user: { id: string };
    }) => Promise<Response>;
  }) => ({
    OPTIONS: vi.fn(),
    POST: (request: Request) =>
      handler({
        request,
        user: {
          id: 'user-1',
        },
      }),
  }),
}));

vi.mock('@/shared/models/user-notification', () => ({
  countUnreadUserNotifications: mocks.countUnreadUserNotifications,
}));

import { POST } from './route';

describe('/api/notifications/unread-count', () => {
  it('returns the unread inbox count for the signed-in user', async () => {
    mocks.countUnreadUserNotifications.mockResolvedValue(4);

    const response = await POST(
      new Request('https://example.com/api/notifications/unread-count', {
        method: 'POST',
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.countUnreadUserNotifications).toHaveBeenCalledWith('user-1');
    await expect(response.json()).resolves.toMatchObject({
      code: 0,
      data: {
        unreadCount: 4,
      },
    });
  });
});
