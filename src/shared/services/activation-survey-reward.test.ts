import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUserById: vi.fn(),
  createCredit: vi.fn(),
  scheduleCreditGrantNotification: vi.fn(),
  safeRecordUserContextEvent: vi.fn(),
  getUuid: vi.fn(() => 'uuid-1'),
  getActivationSurveyRewardStatus: vi.fn(),
}));

vi.mock('@/shared/models/user', () => ({
  findUserById: mocks.findUserById,
}));

vi.mock('@/shared/models/activation-survey', () => ({
  ACTIVATION_SURVEY_REPLY_REWARD_DESCRIPTION:
    'activation survey reply reward',
  ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT:
    'activation_survey_reward_granted',
  DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS: 100,
  getActivationSurveyRewardStatus: mocks.getActivationSurveyRewardStatus,
  getActivationSurveyRewardTransactionNo: (userId: string) =>
    `activation-survey-reward:${userId}`,
}));

vi.mock('@/shared/models/credit', () => ({
  createCredit: mocks.createCredit,
  CreditStatus: {
    ACTIVE: 'active',
  },
  CreditTransactionScene: {
    REWARD: 'reward',
  },
  CreditTransactionType: {
    GRANT: 'grant',
  },
  scheduleCreditGrantNotification: mocks.scheduleCreditGrantNotification,
}));

vi.mock('@/shared/models/user_context_event', () => ({
  safeRecordUserContextEvent: mocks.safeRecordUserContextEvent,
}));

vi.mock('@/shared/lib/hash', () => ({
  getUuid: mocks.getUuid,
}));

import {
  ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT,
  DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
  getActivationSurveyRewardStatus,
  getActivationSurveyRewardTransactionNo,
  grantActivationSurveyReward,
} from './activation-survey-reward';

describe('activation survey reward service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'casey@example.com',
      name: 'Casey',
      locale: 'zh',
      countryCode: 'CN',
      regionCode: 'SH',
    });
    mocks.createCredit.mockResolvedValue({
      id: 'credit-1',
      userId: 'user-1',
      userEmail: 'casey@example.com',
      orderNo: '',
      subscriptionNo: '',
      transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
      transactionType: 'grant',
      transactionScene: 'reward',
      credits: DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
      remainingCredits: DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
      description: 'activation survey reply reward',
      expiresAt: null,
      status: 'active',
      metadata: null,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:00:00.000Z'),
    });
    mocks.scheduleCreditGrantNotification.mockResolvedValue(undefined);
    mocks.safeRecordUserContextEvent.mockResolvedValue(null);
    mocks.getActivationSurveyRewardStatus.mockResolvedValue({
      surveyEmailSentAt: null,
      rewardGrantedAt: null,
      firstSuccessfulGenerationAt: null,
      canGrant: false,
      reason: 'survey-not-sent',
      transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
    });
  });

  it('reuses the reward status lookup from the activation survey model', async () => {
    const expected = {
      surveyEmailSentAt: new Date('2026-04-13T00:00:00.000Z'),
      rewardGrantedAt: null,
      firstSuccessfulGenerationAt: new Date('2026-04-14T08:00:00.000Z'),
      canGrant: true,
      reason: 'ready' as const,
      transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
    };
    mocks.getActivationSurveyRewardStatus.mockResolvedValueOnce(expected);

    const status = await getActivationSurveyRewardStatus('user-1');

    expect(status).toEqual(expected);
    expect(mocks.getActivationSurveyRewardStatus).toHaveBeenCalledWith('user-1');
  });

  it('refuses to grant the reward before the survey email has been sent', async () => {
    const result = await grantActivationSurveyReward({
      userId: 'user-1',
      actorUserId: 'admin-1',
    });

    expect(result).toEqual({
      status: 'survey-not-sent',
      transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
      credits: DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
    });
    expect(mocks.createCredit).not.toHaveBeenCalled();
    expect(mocks.safeRecordUserContextEvent).not.toHaveBeenCalled();
  });

  it('creates the reward credit, schedules the notification, and records the audit event', async () => {
    mocks.getActivationSurveyRewardStatus.mockResolvedValueOnce({
      surveyEmailSentAt: new Date('2026-04-13T00:00:00.000Z'),
      rewardGrantedAt: null,
      firstSuccessfulGenerationAt: null,
      canGrant: true,
      reason: 'ready',
      transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
    });

    const result = await grantActivationSurveyReward({
      userId: 'user-1',
      actorUserId: 'admin-1',
      note: 'gmail reply confirmed',
    });

    expect(result).toEqual({
      status: 'granted',
      transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
      credits: DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
    });
    expect(mocks.createCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        userEmail: 'casey@example.com',
        transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
        transactionType: 'grant',
        transactionScene: 'reward',
        credits: DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
        remainingCredits: DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
        description: 'activation survey reply reward - gmail reply confirmed',
      })
    );
    expect(mocks.scheduleCreditGrantNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'activation_survey_reward',
      })
    );
    expect(mocks.safeRecordUserContextEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        eventType: ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT,
        metadata: expect.objectContaining({
          credits: DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
          actorUserId: 'admin-1',
          note: 'gmail reply confirmed',
          transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
        }),
      })
    );
  });

  it('treats an existing reward credit as already granted', async () => {
    mocks.getActivationSurveyRewardStatus.mockResolvedValueOnce({
      surveyEmailSentAt: new Date('2026-04-13T00:00:00.000Z'),
      rewardGrantedAt: new Date('2026-04-14T00:00:00.000Z'),
      firstSuccessfulGenerationAt: null,
      canGrant: false,
      reason: 'already-granted',
      transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
    });

    const result = await grantActivationSurveyReward({
      userId: 'user-1',
      actorUserId: 'admin-1',
    });

    expect(result).toEqual({
      status: 'already-granted',
      transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
      credits: DEFAULT_ACTIVATION_SURVEY_REPLY_REWARD_CREDITS,
    });
    expect(mocks.createCredit).not.toHaveBeenCalled();
  });
});
