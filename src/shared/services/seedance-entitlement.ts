import { resolvePaidAccessState } from '@/shared/services/paid-access';

export type SeedanceEntitlementTier = 'free' | 'paid';

export type SeedanceEntitlement = {
  tier: SeedanceEntitlementTier;
  watermark: boolean;
  hasPaidCreditHistory: boolean;
  hasCurrentSubscription: boolean;
};

export async function resolveSeedanceEntitlement(
  userId: string
): Promise<SeedanceEntitlement> {
  const { hasPaidCreditHistory, hasCurrentSubscription, tier } =
    await resolvePaidAccessState(userId);

  return {
    tier,
    watermark: tier === 'free',
    hasPaidCreditHistory,
    hasCurrentSubscription,
  };
}
