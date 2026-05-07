import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notifyGuestCreditsConsumed } from './guest-cost-notification';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  sendCreditsNotification: vi.fn(),
  queueCreditsNotificationFailureDigest: vi.fn(),
}));

vi.mock('@/extensions/notification', () => ({
  sendCreditsNotification: mocks.sendCreditsNotification,
}));

vi.mock('./credits-notification-failure-digest', () => ({
  queueCreditsNotificationFailureDigest:
    mocks.queueCreditsNotificationFailureDigest,
}));

const baseTask = {
  id: 'guest-task-1',
  createdAt: new Date('2026-05-05T00:00:00.000Z'),
  scene: 'text-to-image',
  mediaType: 'image',
  provider: 'kie-market',
  model: 'gpt-image-2-text-to-image',
  providerTaskId: 'provider-task-1',
  quotaUnits: 12,
  quotaStatus: 'used',
} as const;

const baseViewer = {
  id: 'guest-viewer-1',
  name: 'Guest Viewer',
  guestIdHash: 'guest-hash-1',
  countryCode: 'US',
} as const;

describe('guest cost notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('does not enqueue a digest when the credits notification succeeds', async () => {
    mocks.sendCreditsNotification.mockResolvedValue({
      code: 0,
      msg: 'ok',
    });

    await notifyGuestCreditsConsumed({
      task: baseTask,
      viewer: baseViewer,
      quotaAfter: {
        limit: 100,
        used: 12,
        remaining: 88,
      },
    });

    expect(mocks.queueCreditsNotificationFailureDigest).not.toHaveBeenCalled();
  });

  it('queues an aggregated failure digest when Feishu returns a non-zero result', async () => {
    mocks.sendCreditsNotification.mockResolvedValue({
      code: 11232,
      msg: 'rate limited',
      httpStatus: 429,
    });

    await notifyGuestCreditsConsumed({
      task: baseTask,
      viewer: baseViewer,
    });

    expect(mocks.queueCreditsNotificationFailureDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'saas-credits',
        source: 'guest_ai_generate',
        subjectType: 'guest',
        scene: 'text-to-image',
        taskId: 'guest-task-1',
        providerTaskId: 'provider-task-1',
        guestIdHash: 'guest-hash-1',
        quotaUnits: 12,
        result: {
          code: 11232,
          msg: 'rate limited',
          httpStatus: 429,
        },
      })
    );
  });

  it('queues an aggregated failure digest when the send throws', async () => {
    const error = new Error('network timeout');
    mocks.sendCreditsNotification.mockRejectedValue(error);

    await notifyGuestCreditsConsumed({
      task: baseTask,
      viewer: baseViewer,
    });

    expect(mocks.queueCreditsNotificationFailureDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'saas-credits',
        source: 'guest_ai_generate',
        subjectType: 'guest',
        scene: 'text-to-image',
        taskId: 'guest-task-1',
        providerTaskId: 'provider-task-1',
        guestIdHash: 'guest-hash-1',
        quotaUnits: 12,
        error,
      })
    );
  });
});
