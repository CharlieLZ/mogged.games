import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  findCreditByTransactionNo: vi.fn(),
  getLatestUserContextEventByType: vi.fn(),
}));

vi.mock('@/core/db', () => ({
  db: mocks.db,
}));

vi.mock('@/shared/models/credit', () => ({
  findCreditByTransactionNo: mocks.findCreditByTransactionNo,
}));

vi.mock('@/shared/models/user_context_event', () => ({
  getLatestUserContextEventByType: mocks.getLatestUserContextEventByType,
}));

import {
  ACTIVATION_SURVEY_REWARD_GRANTED_STATUS,
  ACTIVATION_SURVEY_REWARD_NOT_SENT_STATUS,
  ACTIVATION_SURVEY_REWARD_PENDING_STATUS,
  getActivationSurveyRewardStatus,
  getActivationSurveyRewardStatusesByUserIds,
  getActivationSurveyRewardTransactionNo,
} from './activation-survey';

describe('activation survey model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findCreditByTransactionNo.mockResolvedValue(null);
    mocks.getLatestUserContextEventByType.mockResolvedValue(null);
    mocks.db.mockImplementation(() => ({
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
    }));
  });

  it('reports reward eligibility from survey and reward events', async () => {
    mocks.getLatestUserContextEventByType
      .mockResolvedValueOnce({
        createdAt: new Date('2026-04-14T00:00:00Z'),
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        createdAt: new Date('2026-04-14T03:00:00Z'),
      });

    const status = await getActivationSurveyRewardStatus('user-1');

    expect(status).toEqual({
      surveyEmailSentAt: new Date('2026-04-14T00:00:00Z'),
      rewardGrantedAt: null,
      firstSuccessfulGenerationAt: new Date('2026-04-14T03:00:00Z'),
      canGrant: true,
      reason: 'ready',
      transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
    });
  });

  it('treats an existing reward credit as already granted', async () => {
    mocks.getLatestUserContextEventByType
      .mockResolvedValueOnce({
        createdAt: new Date('2026-04-14T00:00:00Z'),
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mocks.findCreditByTransactionNo.mockResolvedValue({
      createdAt: new Date('2026-04-14T06:00:00Z'),
    });

    const status = await getActivationSurveyRewardStatus('user-1');

    expect(status).toEqual({
      surveyEmailSentAt: new Date('2026-04-14T00:00:00Z'),
      rewardGrantedAt: new Date('2026-04-14T06:00:00Z'),
      firstSuccessfulGenerationAt: null,
      canGrant: false,
      reason: 'already-granted',
      transactionNo: getActivationSurveyRewardTransactionNo('user-1'),
    });
  });

  it('builds batch list statuses without per-user queries', async () => {
    const selectCalls = [[{ userId: 'user-1' }], [{ userId: 'user-2' }], []];

    mocks.db.mockImplementation(() => ({
      select: () => ({
        from: () => ({
          where: () => Promise.resolve(selectCalls.shift() || []),
        }),
      }),
    }));

    const statuses = await getActivationSurveyRewardStatusesByUserIds([
      'user-1',
      'user-2',
      'user-3',
    ]);

    expect(statuses.get('user-1')).toBe(ACTIVATION_SURVEY_REWARD_PENDING_STATUS);
    expect(statuses.get('user-2')).toBe(ACTIVATION_SURVEY_REWARD_GRANTED_STATUS);
    expect(statuses.get('user-3')).toBe(ACTIVATION_SURVEY_REWARD_NOT_SENT_STATUS);
  });
});
