import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CREDITS_NOTIFICATION_FAILURE_DIGEST_WINDOW_MS,
  queueCreditsNotificationFailureDigest,
  resetCreditsNotificationFailureDigestForTest,
} from './credits-notification-failure-digest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  sendErrorNotification: vi.fn(),
}));

vi.mock('@/extensions/notification', () => ({
  sendErrorNotification: mocks.sendErrorNotification,
}));

describe('credits notification failure digest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetCreditsNotificationFailureDigestForTest();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    resetCreditsNotificationFailureDigestForTest();
    vi.useRealTimers();
  });

  it('aggregates repeated saas-credits failures into a single summary alert', async () => {
    mocks.sendErrorNotification.mockResolvedValue({
      code: 0,
      msg: 'ok',
    });

    queueCreditsNotificationFailureDigest({
      channel: 'saas-credits',
      source: 'guest_ai_generate',
      subjectType: 'guest',
      scene: 'text-to-image',
      taskId: 'guest-task-1',
      providerTaskId: 'provider-task-1',
      guestIdHash: 'guest-hash-1',
      quotaUnits: 12,
      result: {
        code: -1,
        msg: 'webhook not configured',
      },
    });
    queueCreditsNotificationFailureDigest({
      channel: 'saas-credits',
      source: 'guest_ai_generate',
      subjectType: 'guest',
      scene: 'image-to-image',
      taskId: 'guest-task-2',
      providerTaskId: 'provider-task-2',
      guestIdHash: 'guest-hash-2',
      quotaUnits: 8,
      result: {
        code: -1,
        msg: 'webhook not configured',
      },
    });

    expect(mocks.sendErrorNotification).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(
      CREDITS_NOTIFICATION_FAILURE_DIGEST_WINDOW_MS
    );

    expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(1);
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        apiEndpoint: 'feishu.saas-credits',
        apiProvider: 'feishu',
        errorCode: '-1',
        type: 'credits_notification_digest',
        errorMessage: expect.stringContaining('suppressed=2'),
        prompt: expect.stringContaining('quota_units=20'),
      })
    );

    const payload = mocks.sendErrorNotification.mock.calls[0][0];
    expect(payload.prompt).toContain('scenes=text-to-image,image-to-image');
    expect(payload.prompt).toContain('task_ids=guest-task-1,guest-task-2');
    expect(payload.prompt).toContain(
      'provider_task_ids=provider-task-1,provider-task-2'
    );
  });

  it('keeps different failure causes in separate digest buckets', async () => {
    mocks.sendErrorNotification.mockResolvedValue({
      code: 0,
      msg: 'ok',
    });

    queueCreditsNotificationFailureDigest({
      channel: 'saas-credits',
      source: 'guest_ai_generate',
      result: {
        code: -1,
        msg: 'webhook not configured',
      },
    });
    queueCreditsNotificationFailureDigest({
      channel: 'saas-credits',
      source: 'guest_ai_generate',
      error: new Error('network timeout'),
    });

    await vi.advanceTimersByTimeAsync(
      CREDITS_NOTIFICATION_FAILURE_DIGEST_WINDOW_MS
    );

    expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(2);
  });
});
