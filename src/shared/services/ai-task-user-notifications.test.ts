import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  upsertUserNotification: vi.fn(),
  maybeSendAITaskCompletionNotification: vi.fn(),
}));

vi.mock('@/shared/models/user-notification', () => ({
  upsertUserNotification: mocks.upsertUserNotification,
}));

vi.mock('./ai-task-completion-notification', () => ({
  maybeSendAITaskCompletionNotification:
    mocks.maybeSendAITaskCompletionNotification,
}));

import { syncAITaskUserNotifications } from './ai-task-user-notifications';

describe('syncAITaskUserNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsertUserNotification.mockResolvedValue(undefined);
    mocks.maybeSendAITaskCompletionNotification.mockResolvedValue(undefined);
  });

  it('creates an inbox notification and email side effect for completed tasks', async () => {
    await syncAITaskUserNotifications({
      task: {
        id: 'task-1',
        userId: 'user-1',
        status: 'success',
        mediaType: 'video',
        scene: 'text-to-video',
        prompt: 'cinematic horse running across the desert',
      },
      user: {
        id: 'user-1',
        email: 'casey@example.com',
        name: 'Casey',
      },
    });

    expect(mocks.upsertUserNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'ai_task_completed',
        sourceType: 'ai_task',
        sourceId: 'task-1',
        dedupeKey: 'ai-task:task-1:success',
        payload: expect.objectContaining({
          taskId: 'task-1',
          scene: 'text-to-video',
          prompt: 'cinematic horse running across the desert',
        }),
      })
    );
    expect(mocks.maybeSendAITaskCompletionNotification).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: 'task-1',
        status: 'success',
      }),
      user: expect.objectContaining({
        id: 'user-1',
      }),
    });
  });

  it('creates a failure inbox notification without sending email', async () => {
    await syncAITaskUserNotifications({
      task: {
        id: 'task-2',
        userId: 'user-2',
        status: 'failed',
        mediaType: 'video',
        scene: 'image-to-video',
        prompt: 'stylized horse portrait becomes cinematic motion',
        taskInfo: {
          errorMessage: 'provider rejected the image url',
        },
      },
    });

    expect(mocks.upsertUserNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        type: 'ai_task_failed',
        sourceType: 'ai_task',
        sourceId: 'task-2',
        dedupeKey: 'ai-task:task-2:failed',
      })
    );
    expect(
      mocks.maybeSendAITaskCompletionNotification
    ).not.toHaveBeenCalled();
  });
});
