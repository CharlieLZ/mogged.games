import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  createCredit: vi.fn(),
  scheduleCreditGrantNotification: vi.fn(),
  getUuid: vi.fn(() => 'credit_123'),
  getAllConfigs: vi.fn(),
}));

vi.mock('@/core/db', () => ({
  db: mocks.db,
}));

vi.mock('@/shared/lib/hash', () => ({
  getUuid: mocks.getUuid,
}));

vi.mock('@/shared/models/config', () => ({
  getAllConfigs: mocks.getAllConfigs,
}));

vi.mock('@/shared/models/credit', () => ({
  createCredit: mocks.createCredit,
  scheduleCreditGrantNotification: mocks.scheduleCreditGrantNotification,
  CreditStatus: {
    ACTIVE: 'active',
  },
  CreditTransactionScene: {
    DAILY_CLAIM: 'daily_claim',
  },
  CreditTransactionType: {
    GRANT: 'grant',
  },
}));

describe('claimDailyCredits', () => {
  beforeEach(() => {
    const selectBuilder = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    mocks.db.mockReset();
    mocks.createCredit.mockReset();
    mocks.scheduleCreditGrantNotification.mockReset();
    mocks.getUuid.mockClear();
    mocks.getAllConfigs.mockReset();

    mocks.db.mockReturnValue({
      select: vi.fn().mockReturnValue(selectBuilder),
    });
    mocks.createCredit.mockResolvedValue(undefined);
    mocks.scheduleCreditGrantNotification.mockResolvedValue(undefined);
    mocks.getAllConfigs.mockResolvedValue({
      daily_claim_credits_amount: '15',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for the credits notification before resolving', async () => {
    let resolveNotification: (() => void) | undefined;
    const notificationPromise = new Promise<void>((resolve) => {
      resolveNotification = resolve;
    });
    mocks.scheduleCreditGrantNotification.mockReturnValue(notificationPromise);

    const { claimDailyCredits } = await import('./daily-claim');

    let settled = false;
    const claimPromise = claimDailyCredits({
      id: 'user_123',
      email: 'alice@example.com',
      name: 'Alice',
    }).then((result) => {
      settled = true;
      return result;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.createCredit).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleCreditGrantNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@example.com',
        source: 'daily_claim',
      })
    );
    expect(settled).toBe(false);

    resolveNotification?.();
    const result = await claimPromise;

    expect(settled).toBe(true);
    expect(result).toEqual({
      alreadyClaimed: false,
      credits: 15,
    });
  });

  it('grants daily claim credits that expire after one week', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-03T10:30:00.000Z'));

    const { claimDailyCredits } = await import('./daily-claim');

    await claimDailyCredits({
      id: 'user_123',
      email: 'alice@example.com',
      name: 'Alice',
    });

    expect(mocks.createCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresAt: new Date('2026-05-10T10:30:00.000Z'),
      })
    );
  });

  it('uses the configured daily claim credit validity when present', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-03T10:30:00.000Z'));
    mocks.getAllConfigs.mockResolvedValue({
      daily_claim_credits_amount: '20',
      daily_claim_credits_valid_days: '3',
    });

    const { claimDailyCredits } = await import('./daily-claim');

    await claimDailyCredits({
      id: 'user_123',
      email: 'alice@example.com',
      name: 'Alice',
    });

    expect(mocks.createCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        credits: 20,
        expiresAt: new Date('2026-05-06T10:30:00.000Z'),
      })
    );
  });

  it('reports one daily claim credit for restricted countries', async () => {
    const { getDailyClaimStatus } = await import('./daily-claim');

    const status = await getDailyClaimStatus('user_123', 'IN');

    expect(status).toEqual({
      claimedToday: false,
      creditsAmount: 1,
    });
  });

  it('grants one daily claim credit for restricted countries', async () => {
    const { claimDailyCredits } = await import('./daily-claim');

    const result = await claimDailyCredits(
      {
        id: 'user_123',
        email: 'alice@example.com',
        name: 'Alice',
      },
      'IN'
    );

    expect(result).toEqual({
      alreadyClaimed: false,
      credits: 1,
    });
    expect(mocks.createCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        credits: 1,
        remainingCredits: 1,
      })
    );
  });
});
