import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getActivationSurveyEmailCandidates: vi.fn(),
  sendActivationSurveyEmail: vi.fn(),
  safeRecordUserContextEvent: vi.fn(),
}));

vi.mock('@/shared/models/activation-survey', () => ({
  getActivationSurveyEmailCandidates: mocks.getActivationSurveyEmailCandidates,
}));

vi.mock('@/shared/services/activation-survey-email', () => ({
  sendActivationSurveyEmail: mocks.sendActivationSurveyEmail,
}));

vi.mock('@/shared/models/user_context_event', () => ({
  safeRecordUserContextEvent: mocks.safeRecordUserContextEvent,
}));

import {
  parseActivationSurveyDispatchArgs,
  runActivationSurveyDispatch,
} from './send-activation-survey';

describe('send activation survey script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActivationSurveyEmailCandidates.mockResolvedValue([]);
    mocks.sendActivationSurveyEmail.mockResolvedValue({
      success: true,
      provider: 'test',
    });
    mocks.safeRecordUserContextEvent.mockResolvedValue(null);
  });

  it('parses hours, limit, email, provider, and dry-run flags', () => {
    expect(
      parseActivationSurveyDispatchArgs([
        '--hours=48',
        '--limit=20',
        '--email=Casey@example.com',
        '--provider=resend',
        '--dry-run',
      ])
    ).toEqual({
      olderThanHours: 48,
      limit: 20,
      email: 'casey@example.com',
      provider: 'resend',
      dryRun: true,
    });
  });

  it('prints dry-run candidates without sending or recording events', async () => {
    mocks.getActivationSurveyEmailCandidates.mockResolvedValue([
      {
        id: 'user-1',
        email: 'casey@example.com',
        name: 'Casey',
        locale: 'en',
        countryCode: 'US',
        regionCode: 'CA',
        createdAt: new Date('2026-04-13T00:00:00.000Z'),
      },
    ]);

    const summary = await runActivationSurveyDispatch(['--dry-run']);

    expect(summary).toMatchObject({
      matched: 1,
      sent: 0,
      failed: 0,
      dryRun: true,
    });
    expect(mocks.sendActivationSurveyEmail).not.toHaveBeenCalled();
    expect(mocks.safeRecordUserContextEvent).not.toHaveBeenCalled();
  });

  it('records a sent event only after a successful delivery', async () => {
    mocks.getActivationSurveyEmailCandidates.mockResolvedValue([
      {
        id: 'user-1',
        email: 'casey@example.com',
        name: 'Casey',
        locale: 'zh',
        countryCode: 'CN',
        regionCode: 'SH',
        createdAt: new Date('2026-04-13T00:00:00.000Z'),
      },
    ]);
    mocks.sendActivationSurveyEmail.mockResolvedValue({
      success: true,
      provider: 'resend',
    });

    const summary = await runActivationSurveyDispatch([
      '--provider=resend',
      '--limit=1',
    ]);

    expect(summary).toMatchObject({
      matched: 1,
      sent: 1,
      failed: 0,
      dryRun: false,
    });
    expect(mocks.sendActivationSurveyEmail).toHaveBeenCalledWith({
      name: 'Casey',
      email: 'casey@example.com',
      locale: 'zh',
      rewardCredits: 100,
      provider: 'resend',
    });
    expect(mocks.safeRecordUserContextEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        eventType: 'email_activation_survey_sent',
        locale: 'zh',
        metadata: expect.objectContaining({
          email: 'casey@example.com',
          rewardCredits: 100,
          provider: 'resend',
        }),
      })
    );
  });
});
