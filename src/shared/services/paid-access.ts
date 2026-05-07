import 'server-only';

import {
  CreditTransactionType,
  getCreditsCount,
} from '@/shared/models/credit';
import { getCurrentSubscription } from '@/shared/models/subscription';

export type PaidAccessTier = 'free' | 'paid';

export type PaidAccessState = {
  tier: PaidAccessTier;
  hasPaidCreditHistory: boolean;
  hasCurrentSubscription: boolean;
};

export async function resolvePaidAccessState(
  userId: string
): Promise<PaidAccessState> {
  const [paidCreditGrantCount, currentSubscription] = await Promise.all([
    getCreditsCount({
      userId,
      transactionType: CreditTransactionType.GRANT,
      isPaid: true,
    }),
    getCurrentSubscription(userId),
  ]);

  const hasPaidCreditHistory = paidCreditGrantCount > 0;
  const hasCurrentSubscription = Boolean(currentSubscription);
  const tier: PaidAccessTier =
    hasPaidCreditHistory || hasCurrentSubscription ? 'paid' : 'free';

  return {
    tier,
    hasPaidCreditHistory,
    hasCurrentSubscription,
  };
}
