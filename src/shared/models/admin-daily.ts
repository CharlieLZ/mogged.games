import 'server-only';

import { unstable_cache } from 'next/cache';
import { and, count, eq, gte, isNull, lt, sql, sum } from 'drizzle-orm';

import { db } from '@/core/db';
import { credit, order, user } from '@/config/db/schema';
import { PaymentType } from '@/extensions/payment/types';

import { CreditStatus, CreditTransactionType } from './credit';
import { getGuestCreditsConsumedByDate } from './guest_ai_task';
import { OrderStatus } from './order';

// 缓存时间 60 秒
const ADMIN_DAILY_REVALIDATE = 60;

export interface DailyStat {
  date: string; // YYYY-MM-DD
  users: number;
  payments: number; // 单位：分
  subscriptions: number; // 单位：分
  creditsConsumed: number;
  guestCreditsConsumed: number;
  creditsGranted: number;
  orders: number;
}

/**
 * 获取指定日期范围的每日统计数据
 */
async function getDailyStatsInternal(days: number = 30): Promise<DailyStat[]> {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  // 生成日期列表
  const dates: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  // 并行查询每日数据
  const [
    usersData,
    paymentsData,
    subscriptionsData,
    creditsConsumedData,
    guestCreditsConsumedData,
    creditsGrantedData,
    ordersData,
  ] = await Promise.all([
    // 每日新增用户
    db()
      .select({
        date: sql<string>`DATE(${user.createdAt})`.as('date'),
        count: count(),
      })
      .from(user)
      .where(and(gte(user.createdAt, startDate), lt(user.createdAt, endDate)))
      .groupBy(sql`DATE(${user.createdAt})`),

    // 每日一次性付款金额
    db()
      .select({
        date: sql<string>`DATE(${order.createdAt})`.as('date'),
        total: sum(order.paymentAmount),
      })
      .from(order)
      .where(
        and(
          eq(order.status, OrderStatus.PAID),
          eq(order.paymentType, PaymentType.ONE_TIME),
          gte(order.createdAt, startDate),
          lt(order.createdAt, endDate),
          isNull(order.deletedAt)
        )
      )
      .groupBy(sql`DATE(${order.createdAt})`),

    // 每日订阅付款金额
    db()
      .select({
        date: sql<string>`DATE(${order.createdAt})`.as('date'),
        total: sum(order.paymentAmount),
      })
      .from(order)
      .where(
        and(
          eq(order.status, OrderStatus.PAID),
          eq(order.paymentType, PaymentType.SUBSCRIPTION),
          gte(order.createdAt, startDate),
          lt(order.createdAt, endDate),
          isNull(order.deletedAt)
        )
      )
      .groupBy(sql`DATE(${order.createdAt})`),

    // 每日消耗积分
    db()
      .select({
        date: sql<string>`DATE(${credit.createdAt})`.as('date'),
        total: sum(credit.credits),
      })
      .from(credit)
      .where(
        and(
          eq(credit.transactionType, CreditTransactionType.CONSUME),
          eq(credit.status, CreditStatus.ACTIVE),
          gte(credit.createdAt, startDate),
          lt(credit.createdAt, endDate),
          isNull(credit.deletedAt)
        )
      )
      .groupBy(sql`DATE(${credit.createdAt})`),

    getGuestCreditsConsumedByDate({
      startAt: startDate,
      endAt: endDate,
    }),

    // 每日发放积分
    db()
      .select({
        date: sql<string>`DATE(${credit.createdAt})`.as('date'),
        total: sum(credit.credits),
      })
      .from(credit)
      .where(
        and(
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          gte(credit.createdAt, startDate),
          lt(credit.createdAt, endDate),
          isNull(credit.deletedAt)
        )
      )
      .groupBy(sql`DATE(${credit.createdAt})`),

    // 每日订单数量（已支付）
    db()
      .select({
        date: sql<string>`DATE(${order.createdAt})`.as('date'),
        count: count(),
      })
      .from(order)
      .where(
        and(
          eq(order.status, OrderStatus.PAID),
          gte(order.createdAt, startDate),
          lt(order.createdAt, endDate),
          isNull(order.deletedAt)
        )
      )
      .groupBy(sql`DATE(${order.createdAt})`),
  ]);

  // 构建 Map 方便查找
  const usersMap = new Map(usersData.map((d) => [d.date, Number(d.count)]));
  const paymentsMap = new Map(
    paymentsData.map((d) => [d.date, Number(d.total || 0)])
  );
  const subscriptionsMap = new Map(
    subscriptionsData.map((d) => [d.date, Number(d.total || 0)])
  );
  const creditsConsumedMap = new Map(
    creditsConsumedData.map((d) => [d.date, Math.abs(Number(d.total || 0))])
  );
  const guestCreditsConsumedMap = new Map(
    guestCreditsConsumedData.map((d) => [d.date, Number(d.total || 0)])
  );
  const creditsGrantedMap = new Map(
    creditsGrantedData.map((d) => [d.date, Number(d.total || 0)])
  );
  const ordersMap = new Map(ordersData.map((d) => [d.date, Number(d.count)]));

  // 合并数据
  return dates.map((date) => {
    const accountCreditsConsumed = creditsConsumedMap.get(date) || 0;
    const guestCreditsConsumed = guestCreditsConsumedMap.get(date) || 0;

    return {
      date,
      users: usersMap.get(date) || 0,
      payments: paymentsMap.get(date) || 0,
      subscriptions: subscriptionsMap.get(date) || 0,
      creditsConsumed: accountCreditsConsumed + guestCreditsConsumed,
      guestCreditsConsumed,
      creditsGranted: creditsGrantedMap.get(date) || 0,
      orders: ordersMap.get(date) || 0,
    };
  });
}

// 缓存版本
export const getDailyStats = unstable_cache(
  getDailyStatsInternal,
  ['admin-daily-stats'],
  {
    revalidate: ADMIN_DAILY_REVALIDATE,
  }
);

// ==================== 每周统计 ====================

export interface WeeklyStat {
  week: string; // YYYY-Www (ISO week)
  weekStart: string; // 周一日期 YYYY-MM-DD
  weekEnd: string; // 周日日期 YYYY-MM-DD
  users: number;
  payments: number;
  subscriptions: number;
  creditsConsumed: number;
  guestCreditsConsumed: number;
  creditsGranted: number;
  orders: number;
}

/**
 * 获取 ISO 周信息
 */
function getISOWeekInfo(date: Date): {
  year: number;
  week: number;
  weekStart: Date;
  weekEnd: Date;
} {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // 周四决定周属于哪一年
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const year = d.getFullYear();
  const week1 = new Date(year, 0, 4);
  const week =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );

  // 计算周一和周日
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStart = new Date(date);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { year, week, weekStart, weekEnd };
}

/**
 * 获取每周统计数据 (最近 N 周)
 */
async function getWeeklyStatsInternal(
  weeks: number = 12
): Promise<WeeklyStat[]> {
  // 获取每日数据，然后按周聚合
  const dailyStats = await getDailyStatsInternal(weeks * 7);

  // 按周聚合
  const weeklyMap = new Map<string, WeeklyStat>();

  for (const day of dailyStats) {
    const date = new Date(day.date);
    const { year, week, weekStart, weekEnd } = getISOWeekInfo(date);
    const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, {
        week: weekKey,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        users: 0,
        payments: 0,
        subscriptions: 0,
        creditsConsumed: 0,
        guestCreditsConsumed: 0,
        creditsGranted: 0,
        orders: 0,
      });
    }

    const stat = weeklyMap.get(weekKey)!;
    stat.users += day.users;
    stat.payments += day.payments;
    stat.subscriptions += day.subscriptions;
    stat.creditsConsumed += day.creditsConsumed;
    stat.guestCreditsConsumed += day.guestCreditsConsumed;
    stat.creditsGranted += day.creditsGranted;
    stat.orders += day.orders;
  }

  // 转换为数组并按周排序
  return Array.from(weeklyMap.values()).sort((a, b) =>
    b.week.localeCompare(a.week)
  );
}

export const getWeeklyStats = unstable_cache(
  getWeeklyStatsInternal,
  ['admin-weekly-stats'],
  {
    revalidate: ADMIN_DAILY_REVALIDATE,
  }
);

// ==================== 每月统计 ====================

export interface MonthlyStat {
  month: string; // YYYY-MM
  users: number;
  payments: number;
  subscriptions: number;
  creditsConsumed: number;
  guestCreditsConsumed: number;
  creditsGranted: number;
  orders: number;
}

/**
 * 获取每月统计数据 (最近 N 个月)
 */
async function getMonthlyStatsInternal(
  months: number = 12
): Promise<MonthlyStat[]> {
  // 获取每日数据，然后按月聚合
  const dailyStats = await getDailyStatsInternal(months * 31);

  // 按月聚合
  const monthlyMap = new Map<string, MonthlyStat>();

  for (const day of dailyStats) {
    const monthKey = day.date.substring(0, 7); // YYYY-MM

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: monthKey,
        users: 0,
        payments: 0,
        subscriptions: 0,
        creditsConsumed: 0,
        guestCreditsConsumed: 0,
        creditsGranted: 0,
        orders: 0,
      });
    }

    const stat = monthlyMap.get(monthKey)!;
    stat.users += day.users;
    stat.payments += day.payments;
    stat.subscriptions += day.subscriptions;
    stat.creditsConsumed += day.creditsConsumed;
    stat.guestCreditsConsumed += day.guestCreditsConsumed;
    stat.creditsGranted += day.creditsGranted;
    stat.orders += day.orders;
  }

  // 转换为数组并按月排序
  return Array.from(monthlyMap.values()).sort((a, b) =>
    b.month.localeCompare(a.month)
  );
}

export const getMonthlyStats = unstable_cache(
  getMonthlyStatsInternal,
  ['admin-monthly-stats'],
  {
    revalidate: ADMIN_DAILY_REVALIDATE,
  }
);
