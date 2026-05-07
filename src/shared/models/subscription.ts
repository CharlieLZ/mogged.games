import 'server-only';

import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { subscription } from '@/config/db/schema';

import { appendUserToResult, type User } from './user';

export type Subscription = typeof subscription.$inferSelect & {
  user?: User;
};
export type NewSubscription = typeof subscription.$inferInsert;
export type UpdateSubscription = Partial<
  Omit<NewSubscription, 'id' | 'subscriptionNo' | 'createdAt'>
>;

export enum SubscriptionStatus {
  PENDING = 'pending',
  APPROVAL_PENDING = 'approval_pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELED = 'canceled',
  CANCELLED = 'cancelled',
  PENDING_CANCEL = 'pending_cancel',
  TRIALING = 'trialing',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

const CURRENT_SUBSCRIPTION_STATUSES = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PENDING_CANCEL,
  SubscriptionStatus.TRIALING,
];

/**
 * create subscription
 */
export async function createSubscription(newSubscription: NewSubscription) {
  const [result] = await db()
    .insert(subscription)
    .values(newSubscription)
    .returning();
  return result;
}

/**
 * update subscription by subscription no
 */
export async function updateSubscriptionBySubscriptionNo(
  subscriptionNo: string,
  updateSubscription: UpdateSubscription
) {
  const [result] = await db()
    .update(subscription)
    .set(updateSubscription)
    .where(eq(subscription.subscriptionNo, subscriptionNo))
    .returning();

  return result;
}

export async function updateSubscriptionById(
  id: string,
  updateSubscription: UpdateSubscription
) {
  const [result] = await db()
    .update(subscription)
    .set(updateSubscription)
    .where(eq(subscription.id, id))
    .returning();
  return result;
}

/**
 * find subscription by id
 */
export async function findSubscriptionById(id: string) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(and(eq(subscription.id, id), isNull(subscription.deletedAt)));

  return result;
}

/**
 * find subscription by subscription no
 */
export async function findSubscriptionBySubscriptionNo(subscriptionNo: string) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.subscriptionNo, subscriptionNo),
        isNull(subscription.deletedAt)
      )
    );

  return result;
}

export async function findSubscriptionByProviderSubscriptionId({
  provider,
  subscriptionId,
}: {
  provider: string;
  subscriptionId: string;
}) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.paymentProvider, provider),
        eq(subscription.subscriptionId, subscriptionId),
        isNull(subscription.deletedAt)
      )
    );

  return result;
}

/**
 * get subscriptions
 */
export async function getSubscriptions({
  userId,
  status,
  interval,
  getUser,
  page = 1,
  limit = 30,
}: {
  userId?: string;
  status?: string;
  getUser?: boolean;
  interval?: string;
  page?: number;
  limit?: number;
}): Promise<Subscription[]> {
  const result = await db()
    .select()
    .from(subscription)
    .where(
      and(
        userId ? eq(subscription.userId, userId) : undefined,
        status ? eq(subscription.status, status) : undefined,
        interval ? eq(subscription.interval, interval) : undefined,
        isNull(subscription.deletedAt)
      )
    )
    .orderBy(desc(subscription.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

/**
 * get current subscription
 */
async function getCurrentSubscriptionRecord({
  userId,
  interval,
}: {
  userId: string;
  interval?: string;
}) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, userId),
        interval ? eq(subscription.interval, interval) : undefined,
        isNull(subscription.deletedAt),
        inArray(subscription.status, CURRENT_SUBSCRIPTION_STATUSES)
      )
    )
    .orderBy(desc(subscription.currentPeriodEnd), desc(subscription.createdAt))
    .limit(1);

  return result;
}

export async function getCurrentSubscription(userId: string) {
  return getCurrentSubscriptionRecord({ userId });
}

export async function getCurrentYearlySubscription(userId: string) {
  return getCurrentSubscriptionRecord({
    userId,
    interval: 'year',
  });
}

/**
 * get subscriptions count
 */
export async function getSubscriptionsCount({
  userId,
  status,
  interval,
}: {
  userId?: string;
  status?: string;
  interval?: string;
} = {}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(subscription)
    .where(
      and(
        userId ? eq(subscription.userId, userId) : undefined,
        status ? eq(subscription.status, status) : undefined,
        interval ? eq(subscription.interval, interval) : undefined,
        isNull(subscription.deletedAt)
      )
    );

  return result?.count || 0;
}
