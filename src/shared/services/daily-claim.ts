import 'server-only';

import { and, eq, gte, isNull, lt } from 'drizzle-orm';

import { db } from '@/core/db';
import { credit } from '@/config/db/schema';
import {
  buildDailyClaimTransactionNo,
  calculateDailyClaimExpirationTime,
  getDailyClaimWindow,
  parseDailyClaimCreditsAmount,
  parseDailyClaimValidDays,
} from '@/shared/lib/daily-claim';
import { resolveCreditRegionPolicy } from '@/shared/lib/credit-region-policy';
import { getUuid } from '@/shared/lib/hash';
import { isPostgresDuplicateKeyError } from '@/shared/lib/postgres-error';
import { getAllConfigs } from '@/shared/models/config';
import {
  createCredit,
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
  scheduleCreditGrantNotification,
} from '@/shared/models/credit';

type DailyClaimUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type DailyClaimStatus = {
  claimedToday: boolean;
  creditsAmount: number;
};

function isUniqueViolation(error: unknown) {
  return isPostgresDuplicateKeyError(error);
}

async function hasDailyClaimRecord(options: {
  userId: string;
  start: Date;
  end: Date;
}) {
  const [existingClaim] = await db()
    .select({ id: credit.id })
    .from(credit)
    .where(
      and(
        eq(credit.userId, options.userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.transactionScene, CreditTransactionScene.DAILY_CLAIM),
        isNull(credit.deletedAt),
        gte(credit.createdAt, options.start),
        lt(credit.createdAt, options.end)
      )
    )
    .limit(1);

  return Boolean(existingClaim);
}

async function getDailyClaimConfig(date = new Date()) {
  const { start, end } = getDailyClaimWindow(date);
  const configs = await getAllConfigs();

  return {
    start,
    end,
    creditsAmount: parseDailyClaimCreditsAmount(
      configs.daily_claim_credits_amount
    ),
    creditsValidDays: parseDailyClaimValidDays(
      configs.daily_claim_credits_valid_days
    ),
  };
}

export async function getDailyClaimStatus(
  userId: string,
  countryCode?: string | null
): Promise<DailyClaimStatus> {
  const { start, end, creditsAmount } = await getDailyClaimConfig();
  const policy = resolveCreditRegionPolicy({
    countryCode,
    dailyClaimCredits: creditsAmount,
  });

  return {
    claimedToday: await hasDailyClaimRecord({
      userId,
      start,
      end,
    }),
    creditsAmount: policy.dailyClaimCredits,
  };
}

export async function claimDailyCredits(
  user: DailyClaimUser,
  countryCode?: string | null
) {
  const {
    start,
    end,
    creditsAmount: configCredits,
    creditsValidDays,
  } = await getDailyClaimConfig();
  const policy = resolveCreditRegionPolicy({
    countryCode,
    dailyClaimCredits: configCredits,
  });
  const dailyClaimCredits = policy.dailyClaimCredits;

  if (
    await hasDailyClaimRecord({
      userId: user.id,
      start,
      end,
    })
  ) {
    return {
      alreadyClaimed: true,
      credits: dailyClaimCredits,
    };
  }

  const newCredit = {
    id: getUuid(),
    userId: user.id,
    userEmail: user.email || '',
    orderNo: '',
    subscriptionNo: '',
    transactionNo: buildDailyClaimTransactionNo(user.id, start),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: CreditTransactionScene.DAILY_CLAIM,
    credits: dailyClaimCredits,
    remainingCredits: dailyClaimCredits,
    description: 'Daily login bonus',
    expiresAt: calculateDailyClaimExpirationTime({
      validDays: creditsValidDays,
    }),
    status: CreditStatus.ACTIVE,
  } as const;

  try {
    await createCredit(newCredit);
  } catch (error) {
    if (
      isUniqueViolation(error) &&
      (await hasDailyClaimRecord({
        userId: user.id,
        start,
        end,
      }))
    ) {
      return {
        alreadyClaimed: true,
        credits: dailyClaimCredits,
      };
    }

    throw error;
  }

  await scheduleCreditGrantNotification({
    credit: newCredit,
    email: user.email || undefined,
    name: user.name || undefined,
    source: 'daily_claim',
  });

  return {
    alreadyClaimed: false,
    credits: dailyClaimCredits,
  };
}
