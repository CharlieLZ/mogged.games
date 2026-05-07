import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserImageTaskHistorySnapshot: vi.fn(),
}));

vi.mock('@/shared/lib/api/secure-json-route', () => ({
  createSecureJsonPostRoute: ({
    handler,
  }: {
    handler: (context: {
      request: Request;
      user: { id: string };
      body: { limit?: number };
    }) => Promise<Response>;
  }) => ({
    OPTIONS: vi.fn(),
    POST: async (request: Request) =>
      handler({
        request,
        user: {
          id: 'user-1',
        },
        body: ((await request.json()) as { limit?: number }) || {},
      }),
  }),
}));

vi.mock('@/shared/services/image-task-history', () => ({
  getUserImageTaskHistorySnapshot: mocks.getUserImageTaskHistorySnapshot,
}));

import { POST } from './route';

describe('/api/user/ai-tasks/recent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the signed-in user recent image task snapshot', async () => {
    mocks.getUserImageTaskHistorySnapshot.mockResolvedValue({
      items: [
        {
          id: 'task-1',
          createdAt: '2026-04-29T11:29:21.000Z',
          status: 'success',
        },
      ],
      total: 1,
    });

    const response = await POST(
      new Request('https://example.com/api/user/ai-tasks/recent', {
        method: 'POST',
        body: JSON.stringify({ limit: 4 }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.getUserImageTaskHistorySnapshot).toHaveBeenCalledWith({
      userId: 'user-1',
      limit: 4,
    });
    await expect(response.json()).resolves.toMatchObject({
      code: 0,
      data: {
        total: 1,
      },
    });
  });
});
