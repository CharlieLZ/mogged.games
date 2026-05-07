import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  softDeleteAITaskById: vi.fn(),
}));

vi.mock('@/shared/lib/api/secure-json-route', () => ({
  createSecureJsonPostRoute: ({
    handler,
  }: {
    handler: (context: {
      request: Request;
      user: { id: string };
      body: { taskId: string };
    }) => Promise<Response>;
  }) => ({
    OPTIONS: vi.fn(),
    POST: async (request: Request) =>
      handler({
        request,
        user: {
          id: 'user-1',
        },
        body: (await request.json()) as { taskId: string },
      }),
  }),
}));

vi.mock('@/shared/models/ai_task', () => ({
  softDeleteAITaskById: mocks.softDeleteAITaskById,
}));

import { POST } from './route';

describe('/api/user/ai-tasks/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soft deletes the signed-in user task', async () => {
    mocks.softDeleteAITaskById.mockResolvedValue('task-1');

    const response = await POST(
      new Request('https://example.com/api/user/ai-tasks/delete', {
        method: 'POST',
        body: JSON.stringify({ taskId: 'task-1' }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.softDeleteAITaskById).toHaveBeenCalledWith({
      id: 'task-1',
      userId: 'user-1',
    });
    await expect(response.json()).resolves.toMatchObject({
      code: 0,
      data: {
        taskId: 'task-1',
      },
    });
  });

  it('returns 404 when the signed-in user task does not exist', async () => {
    mocks.softDeleteAITaskById.mockResolvedValue(null);

    const response = await POST(
      new Request('https://example.com/api/user/ai-tasks/delete', {
        method: 'POST',
        body: JSON.stringify({ taskId: 'task-missing' }),
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: -1,
      message: 'ai task not found',
    });
  });
});
