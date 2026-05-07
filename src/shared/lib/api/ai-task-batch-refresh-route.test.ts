import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserInfo } from '@/shared/services/current-user';
import { refreshAITasksBatch } from '@/shared/services/ai-task-refresh';

import { createAITaskBatchRefreshRoute } from './ai-task-batch-refresh-route';
import { enforceApiWriteSecurity } from './request-security';

vi.mock('server-only', () => ({}));

vi.mock('./request-security', () => ({
  createApiPreflightResponse: vi.fn(() => new Response(null, { status: 204 })),
  enforceApiWriteSecurity: vi.fn(),
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: vi.fn(),
}));

vi.mock('@/shared/services/ai-task-refresh', () => ({
  batchRefreshRequestSchema: {
    safeParse: vi.fn((value: unknown) => ({
      success:
        typeof value === 'object' &&
        value !== null &&
        Array.isArray((value as { taskIds?: unknown[] }).taskIds),
      data: value,
    })),
  },
  refreshAITasksBatch: vi.fn(),
}));

describe('ai task batch refresh route', () => {
  beforeEach(() => {
    vi.mocked(enforceApiWriteSecurity).mockReset();
    vi.mocked(getUserInfo).mockReset();
    vi.mocked(refreshAITasksBatch).mockReset();
    vi.mocked(enforceApiWriteSecurity).mockResolvedValue(null);
  });

  it('passes user-aware access control into the shared batch refresher', async () => {
    vi.mocked(getUserInfo).mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
    } as never);
    vi.mocked(refreshAITasksBatch).mockResolvedValue({
      results: [],
      hasAnyChange: false,
      refreshedCount: 0,
      totalCount: 0,
    });

    const { POST } = createAITaskBatchRefreshRoute({
      actionName: 'user-batch-refresh',
      loggerLabel: 'User Batch Refresh',
      canAccessTask: (task, user) => task.userId === user.id,
    });

    const response = await POST(
      new Request('https://example.com/api/user/ai-tasks/batch-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({ taskIds: ['task-1'] }),
      })
    );

    expect(response.status).toBe(200);
    expect(refreshAITasksBatch).toHaveBeenCalledTimes(1);

    const call = vi.mocked(refreshAITasksBatch).mock.calls[0]?.[0];
    expect(call?.taskIds).toEqual(['task-1']);
    expect(call?.loggerLabel).toBe('User Batch Refresh');
    expect(await call?.canAccessTask?.({ userId: 'user-1' } as never)).toBe(
      true
    );
    expect(await call?.canAccessTask?.({ userId: 'other-user' } as never)).toBe(
      false
    );
  });

  it('returns authorization error before refreshing tasks', async () => {
    vi.mocked(getUserInfo).mockResolvedValue({
      id: 'user-2',
      email: 'admin@example.com',
    } as never);

    const { POST } = createAITaskBatchRefreshRoute({
      actionName: 'admin-batch-refresh',
      loggerLabel: 'Batch Refresh',
      authorize: async () =>
        new Response(JSON.stringify({ code: -1, message: 'no permission' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
    });

    const response = await POST(
      new Request('https://example.com/api/admin/ai-tasks/batch-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({ taskIds: ['task-2'] }),
      })
    );

    const body = await response.json();

    expect(body).toMatchObject({
      code: -1,
      message: 'no permission',
    });
    expect(refreshAITasksBatch).not.toHaveBeenCalled();
  });
});
