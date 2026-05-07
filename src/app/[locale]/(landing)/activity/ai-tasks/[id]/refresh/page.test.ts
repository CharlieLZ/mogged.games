import { beforeEach, describe, expect, it, vi } from 'vitest';

import RefreshAITaskPage from './page';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  findAITaskById: vi.fn(),
  getUserInfo: vi.fn(),
  refreshAITasksBatch: vi.fn(),
}));

vi.mock('@/core/i18n/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/shared/blocks/common/empty', () => ({
  Empty: ({ message }: { message: string }) => ({
    type: 'empty',
    message,
  }),
}));

vi.mock('@/shared/models/ai_task', () => ({
  findAITaskById: mocks.findAITaskById,
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: mocks.getUserInfo,
}));

vi.mock('@/shared/services/ai-task-refresh', () => ({
  refreshAITasksBatch: mocks.refreshAITasksBatch,
}));

describe('RefreshAITaskPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not refresh another user task', async () => {
    mocks.getUserInfo.mockResolvedValue({ id: 'user-1' });
    mocks.findAITaskById.mockResolvedValue({
      id: 'task-1',
      userId: 'user-2',
      taskId: 'provider-task-1',
      provider: 'kie',
      status: 'processing',
    });

    const result = await RefreshAITaskPage({
      params: Promise.resolve({ locale: 'en', id: 'task-1' }),
    });

    expect(result).toMatchObject({
      props: { message: 'Task not found' },
    });
    expect(mocks.refreshAITasksBatch).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('refreshes the current user task and redirects to activity', async () => {
    mocks.getUserInfo.mockResolvedValue({ id: 'user-1' });
    mocks.findAITaskById.mockResolvedValue({
      id: 'task-1',
      userId: 'user-1',
      taskId: 'provider-task-1',
      provider: 'kie',
      status: 'processing',
    });

    await RefreshAITaskPage({
      params: Promise.resolve({ locale: 'zh', id: 'task-1' }),
    });

    expect(mocks.refreshAITasksBatch).toHaveBeenCalledWith({
      taskIds: ['task-1'],
      canAccessTask: expect.any(Function),
      loggerLabel: 'activity-ai-task-refresh-page',
    });
    expect(mocks.redirect).toHaveBeenCalledWith({
      href: '/activity/ai-tasks',
      locale: 'zh',
    });
  });
});
