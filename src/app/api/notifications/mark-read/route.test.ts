import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  markUserNotificationsRead: vi.fn(),
}));

vi.mock('@/shared/lib/api/secure-json-route', () => ({
  createSecureJsonPostRoute: ({
    schema,
    parseErrorMessage,
    handler,
  }: {
    schema: {
      safeParse: (value: unknown) => {
        success: boolean;
        data?: unknown;
      };
    };
    parseErrorMessage: string;
    handler: (context: {
      request: Request;
      user: { id: string };
      body: { notificationIds: string[] };
    }) => Promise<Response>;
  }) => ({
    OPTIONS: vi.fn(),
    POST: async (request: Request) => {
      const rawBody = await request.json();
      const parsed = schema.safeParse(rawBody);

      if (!parsed.success) {
        return Response.json(
          {
            code: -1,
            message: parseErrorMessage,
          },
          { status: 400 }
        );
      }

      return handler({
        request,
        user: {
          id: 'user-1',
        },
        body: parsed.data as { notificationIds: string[] },
      });
    },
  }),
}));

vi.mock('@/shared/models/user-notification', () => ({
  markUserNotificationsRead: mocks.markUserNotificationsRead,
}));

import { POST } from './route';

describe('/api/notifications/mark-read', () => {
  it('marks the provided notifications as read for the current user', async () => {
    mocks.markUserNotificationsRead.mockResolvedValue(2);

    const response = await POST(
      new Request('https://example.com/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: ['notification-1', 'notification-2'],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.markUserNotificationsRead).toHaveBeenCalledWith({
      userId: 'user-1',
      notificationIds: ['notification-1', 'notification-2'],
    });
    await expect(response.json()).resolves.toMatchObject({
      code: 0,
      data: {
        updatedCount: 2,
      },
    });
  });
});
