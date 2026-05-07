import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getCreditsCount: vi.fn(),
  getCurrentSubscription: vi.fn(),
}));

vi.mock('@/shared/models/credit', () => ({
  CreditTransactionType: {
    GRANT: 'grant',
  },
  getCreditsCount: mocks.getCreditsCount,
}));

vi.mock('@/shared/models/subscription', () => ({
  getCurrentSubscription: mocks.getCurrentSubscription,
}));

describe('resolveSeedanceEntitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats users with no paid credit history and no current subscription as free accounts', async () => {
    mocks.getCreditsCount.mockResolvedValue(0);
    mocks.getCurrentSubscription.mockResolvedValue(null);

    const { resolveSeedanceEntitlement } = await import(
      './seedance-entitlement'
    );

    await expect(resolveSeedanceEntitlement('user-free')).resolves.toEqual({
      tier: 'free',
      watermark: true,
      hasPaidCreditHistory: false,
      hasCurrentSubscription: false,
    });
  });

  it('treats users with paid credit history as paid accounts even without an active subscription', async () => {
    mocks.getCreditsCount.mockResolvedValue(2);
    mocks.getCurrentSubscription.mockResolvedValue(null);

    const { resolveSeedanceEntitlement } = await import(
      './seedance-entitlement'
    );

    await expect(resolveSeedanceEntitlement('user-paid')).resolves.toEqual({
      tier: 'paid',
      watermark: false,
      hasPaidCreditHistory: true,
      hasCurrentSubscription: false,
    });
  });

  it('treats users with a current subscription as paid accounts even without paid credit history', async () => {
    mocks.getCreditsCount.mockResolvedValue(0);
    mocks.getCurrentSubscription.mockResolvedValue({
      id: 'subscription_1',
    });

    const { resolveSeedanceEntitlement } = await import(
      './seedance-entitlement'
    );

    await expect(resolveSeedanceEntitlement('user-sub')).resolves.toEqual({
      tier: 'paid',
      watermark: false,
      hasPaidCreditHistory: false,
      hasCurrentSubscription: true,
    });
  });
});
