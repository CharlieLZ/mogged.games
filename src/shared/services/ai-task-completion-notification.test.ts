import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  claimAITaskCompletionNotificationDelivery: vi.fn(),
  markAITaskCompletionNotificationDelivered: vi.fn(),
  markAITaskCompletionNotificationFailed: vi.fn(),
  findUserById: vi.fn(),
}));

vi.mock('@/shared/services/email', () => ({
  getEmailService: vi.fn(async () => ({
    sendEmail: mocks.sendEmail,
  })),
}));

vi.mock('@/shared/models/ai_task', () => ({
  claimAITaskCompletionNotificationDelivery:
    mocks.claimAITaskCompletionNotificationDelivery,
  markAITaskCompletionNotificationDelivered:
    mocks.markAITaskCompletionNotificationDelivered,
  markAITaskCompletionNotificationFailed:
    mocks.markAITaskCompletionNotificationFailed,
}));

vi.mock('@/shared/models/user', () => ({
  findUserById: mocks.findUserById,
}));

import { maybeSendAITaskCompletionNotification } from './ai-task-completion-notification';

describe('maybeSendAITaskCompletionNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claimAITaskCompletionNotificationDelivery.mockResolvedValue(true);
    mocks.markAITaskCompletionNotificationDelivered.mockResolvedValue(undefined);
    mocks.markAITaskCompletionNotificationFailed.mockResolvedValue(undefined);
    mocks.findUserById.mockResolvedValue({
      id: 'user-1',
      name: 'Casey',
      email: 'casey@example.com',
      locale: 'zh',
    });
    mocks.sendEmail.mockResolvedValue({
      success: true,
      provider: 'resend',
    });
  });

  it('sends a localized completion email with task and download urls', async () => {
    await maybeSendAITaskCompletionNotification({
      task: {
        id: 'task-1',
        userId: 'user-1',
        status: 'success',
        scene: 'text-to-video',
        mediaType: 'video',
        prompt: 'cinematic running horse',
        completionNotificationRequested: true,
        completionNotificationLocale: 'zh',
        completionNotificationSentAt: null,
        taskInfo: {
          videos: [
            {
              videoUrl: 'https://cdn.example.com/output.mp4',
            },
          ],
        },
        taskResult: null,
      },
    });

    expect(mocks.claimAITaskCompletionNotificationDelivery).toHaveBeenCalledWith(
      'task-1'
    );
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

    const [message] = mocks.sendEmail.mock.calls[0] as [
      {
        subject: string;
        html: string;
        text: string;
        to: string;
      },
    ];

    expect(message.to).toBe('casey@example.com');
    expect(message.subject).toContain('任务已完成');
    expect(message.html).toContain('cinematic running horse');
    expect(message.html).toContain(
      'https://mogged.games/zh/activity/ai-tasks/task-1'
    );
    expect(message.html).toContain('https://cdn.example.com/output.mp4');
    expect(message.text).toContain('/zh/activity/ai-tasks/task-1');
    expect(mocks.markAITaskCompletionNotificationDelivered).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        deliveryProvider: 'resend',
      })
    );
    expect(
      mocks.markAITaskCompletionNotificationFailed
    ).not.toHaveBeenCalled();
  });

  it('skips delivery when the claim lock is not acquired', async () => {
    mocks.claimAITaskCompletionNotificationDelivery.mockResolvedValue(false);

    await maybeSendAITaskCompletionNotification({
      task: {
        id: 'task-2',
        userId: 'user-1',
        status: 'success',
        mediaType: 'video',
        prompt: 'already claimed elsewhere',
        completionNotificationRequested: true,
        completionNotificationLocale: 'en',
        completionNotificationSentAt: null,
        taskInfo: null,
        taskResult: null,
      },
    });

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(
      mocks.markAITaskCompletionNotificationDelivered
    ).not.toHaveBeenCalled();
  });
});
