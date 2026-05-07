import { unstable_cache } from 'next/cache';
import { and, count, desc, eq, gt, isNull, sum } from 'drizzle-orm';

import { db } from '@/core/db';
import { credit, order, user } from '@/config/db/schema';
import { PaymentType } from '@/extensions/payment/types';

import { CreditStatus, CreditTransactionType } from './credit';
import {
  findRecentGuestCostTasks,
  getGuestCreditsConsumedTotal,
  type GuestAITask,
} from './guest_ai_task';
import { OrderStatus } from './order';

// Cache revalidation time in seconds (60 seconds for admin stats)
const ADMIN_STATS_REVALIDATE = 60;

export type RangeStat = {
  last7Days: number;
  last30Days: number;
};

export type AdminOverviewStats = {
  users: RangeStat;
  payments: RangeStat; // unit: cents
  subscriptions: RangeStat; // unit: cents
  credits: RangeStat; // unit: credits
  guestCreditsConsumed: RangeStat; // unit: guest quota units
  creditsGranted: RangeStat; // unit: credits granted
};

export type AdminOverviewRecent = {
  users: Array<
    Pick<typeof user.$inferSelect, 'id' | 'name' | 'email' | 'createdAt'>
  >;
  creditConsumes: Array<
    Pick<
      typeof credit.$inferSelect,
      | 'id'
      | 'transactionNo'
      | 'credits'
      | 'description'
      | 'transactionScene'
      | 'createdAt'
    >
  >;
  ordersPaid: Array<
    Pick<
      typeof order.$inferSelect,
      'orderNo' | 'amount' | 'currency' | 'description' | 'createdAt'
    >
  >;
  subscriptionsPaid: Array<
    Pick<
      typeof order.$inferSelect,
      'orderNo' | 'amount' | 'currency' | 'description' | 'createdAt'
    >
  >;
  creditsGranted: Array<
    Pick<
      typeof credit.$inferSelect,
      | 'id'
      | 'transactionNo'
      | 'credits'
      | 'description'
      | 'transactionScene'
      | 'createdAt'
    >
  >;
  guestCreditsConsumed: Array<
    Pick<
      GuestAITask,
      | 'id'
      | 'guestIdHash'
      | 'scene'
      | 'provider'
      | 'providerTaskId'
      | 'quotaUnits'
      | 'createdAt'
    >
  >;
};

function getSinceDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function getUsersCountSince(since: Date) {
  const [result] = await db()
    .select({ count: count() })
    .from(user)
    .where(gt(user.createdAt, since));

  return Number(result?.count || 0);
}

async function getPaidAmountSince({
  since,
  paymentType,
}: {
  since: Date;
  paymentType?: PaymentType;
}) {
  const [result] = await db()
    .select({ total: sum(order.paymentAmount) })
    .from(order)
    .where(
      and(
        eq(order.status, OrderStatus.PAID),
        gt(order.createdAt, since),
        paymentType ? eq(order.paymentType, paymentType) : undefined,
        isNull(order.deletedAt)
      )
    );

  return Number(result?.total || 0);
}

async function getAccountCreditsConsumedSince(since: Date) {
  const [result] = await db()
    .select({ total: sum(credit.credits) })
    .from(credit)
    .where(
      and(
        eq(credit.transactionType, CreditTransactionType.CONSUME),
        eq(credit.status, CreditStatus.ACTIVE),
        gt(credit.createdAt, since),
        isNull(credit.deletedAt)
      )
    );

  const total = Number(result?.total || 0);
  return Math.abs(total);
}

async function getGuestCreditsConsumedSince({
  startAt,
  endAt,
}: {
  startAt: Date;
  endAt: Date;
}) {
  return getGuestCreditsConsumedTotal({ startAt, endAt });
}

async function getCreditsGrantedSince(since: Date) {
  const [result] = await db()
    .select({ total: sum(credit.credits) })
    .from(credit)
    .where(
      and(
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.status, CreditStatus.ACTIVE),
        gt(credit.createdAt, since),
        isNull(credit.deletedAt)
      )
    );

  return Number(result?.total || 0);
}

async function getAdminOverviewStatsInternal(): Promise<AdminOverviewStats> {
  const last7Days = getSinceDate(7);
  const last30Days = getSinceDate(30);
  const now = new Date();

  const [
    users7,
    users30,
    paid7,
    paid30,
    subscriptionPaid7,
    subscriptionPaid30,
    accountCredits7,
    accountCredits30,
    guestCredits7,
    guestCredits30,
    creditsGranted7,
    creditsGranted30,
  ] = await Promise.all([
    getUsersCountSince(last7Days),
    getUsersCountSince(last30Days),
    getPaidAmountSince({ since: last7Days }),
    getPaidAmountSince({ since: last30Days }),
    getPaidAmountSince({
      since: last7Days,
      paymentType: PaymentType.SUBSCRIPTION,
    }),
    getPaidAmountSince({
      since: last30Days,
      paymentType: PaymentType.SUBSCRIPTION,
    }),
    getAccountCreditsConsumedSince(last7Days),
    getAccountCreditsConsumedSince(last30Days),
    getGuestCreditsConsumedSince({
      startAt: last7Days,
      endAt: now,
    }),
    getGuestCreditsConsumedSince({
      startAt: last30Days,
      endAt: now,
    }),
    getCreditsGrantedSince(last7Days),
    getCreditsGrantedSince(last30Days),
  ]);

  return {
    users: {
      last7Days: users7,
      last30Days: users30,
    },
    payments: {
      last7Days: paid7,
      last30Days: paid30,
    },
    subscriptions: {
      last7Days: subscriptionPaid7,
      last30Days: subscriptionPaid30,
    },
    credits: {
      last7Days: accountCredits7 + guestCredits7,
      last30Days: accountCredits30 + guestCredits30,
    },
    guestCreditsConsumed: {
      last7Days: guestCredits7,
      last30Days: guestCredits30,
    },
    creditsGranted: {
      last7Days: creditsGranted7,
      last30Days: creditsGranted30,
    },
  };
}

// Cached version of getAdminOverviewStats - revalidates every 60 seconds
export const getAdminOverviewStats = unstable_cache(
  getAdminOverviewStatsInternal,
  ['admin-overview-stats'],
  { revalidate: ADMIN_STATS_REVALIDATE }
);

async function getAdminOverviewRecentInternal(): Promise<AdminOverviewRecent> {
  const [
    usersRecent,
    creditConsumesRecent,
    ordersPaid,
    subscriptionsPaid,
    creditsGranted,
    guestCreditsConsumed,
  ] = await Promise.all([
    db()
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(10),
    db()
      .select({
        id: credit.id,
        transactionNo: credit.transactionNo,
        credits: credit.credits,
        description: credit.description,
        transactionScene: credit.transactionScene,
        createdAt: credit.createdAt,
      })
      .from(credit)
      .where(
        and(
          eq(credit.transactionType, CreditTransactionType.CONSUME),
          eq(credit.status, CreditStatus.ACTIVE),
          isNull(credit.deletedAt)
        )
      )
      .orderBy(desc(credit.createdAt))
      .limit(10),
    db()
      .select({
        orderNo: order.orderNo,
        amount: order.amount,
        currency: order.currency,
        description: order.description,
        createdAt: order.createdAt,
      })
      .from(order)
      .where(and(eq(order.status, OrderStatus.PAID), isNull(order.deletedAt)))
      .orderBy(desc(order.createdAt))
      .limit(10),
    db()
      .select({
        orderNo: order.orderNo,
        amount: order.amount,
        currency: order.currency,
        description: order.description,
        createdAt: order.createdAt,
      })
      .from(order)
      .where(
        and(
          eq(order.status, OrderStatus.PAID),
          eq(order.paymentType, PaymentType.SUBSCRIPTION),
          isNull(order.deletedAt)
        )
      )
      .orderBy(desc(order.createdAt))
      .limit(10),
    db()
      .select({
        id: credit.id,
        transactionNo: credit.transactionNo,
        credits: credit.credits,
        description: credit.description,
        transactionScene: credit.transactionScene,
        createdAt: credit.createdAt,
      })
      .from(credit)
      .where(
        and(
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          isNull(credit.deletedAt)
        )
      )
      .orderBy(desc(credit.createdAt))
      .limit(10),
    findRecentGuestCostTasks(10),
  ]);

  return {
    users: usersRecent,
    creditConsumes: creditConsumesRecent,
    ordersPaid,
    subscriptionsPaid,
    creditsGranted,
    guestCreditsConsumed,
  };
}

// Cached version of getAdminOverviewRecent - revalidates every 60 seconds
export const getAdminOverviewRecent = unstable_cache(
  getAdminOverviewRecentInternal,
  ['admin-overview-recent'],
  { revalidate: ADMIN_STATS_REVALIDATE }
);
