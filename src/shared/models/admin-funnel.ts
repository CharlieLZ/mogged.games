import 'server-only';

import { unstable_cache } from 'next/cache';
import { and, eq, gte, inArray, isNull, lt, or } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  order,
  user,
  userAcquisition,
  userContextEvent,
} from '@/config/db/schema';
import {
  calculateConversionRate,
  CHECKOUT_STARTED_EVENT,
  FIRST_SUCCESSFUL_GENERATION_EVENT,
} from '@/shared/lib/funnel';

import { OrderStatus } from './order';

const ADMIN_FUNNEL_REVALIDATE = 60;

type FunnelEventMoments = {
  signupAt: Date;
  firstSuccessfulGenerationMoments: Date[];
  checkoutStartMoments: Date[];
  paidMoments: Date[];
};

export type FunnelJourney = {
  userId: string;
  signupAt: Date;
  firstSuccessfulGenerationAt?: Date | null;
  checkoutStartedAt?: Date | null;
  paidAt?: Date | null;
};

export interface DailyFunnelStat {
  date: string;
  signups: number;
  firstSuccessfulGenerations: number;
  checkoutStarts: number;
  paidUsers: number;
  signupToFirstSuccessRate: number;
  firstSuccessToCheckoutRate: number;
  checkoutToPaidRate: number;
  signupToPaidRate: number;
}

export interface MonthlyFunnelStat {
  month: string;
  signups: number;
  firstSuccessfulGenerations: number;
  checkoutStarts: number;
  paidUsers: number;
  signupToFirstSuccessRate: number;
  firstSuccessToCheckoutRate: number;
  checkoutToPaidRate: number;
  signupToPaidRate: number;
}

export type UserFunnelSnapshot = {
  signupAt: Date;
  firstSuccessfulGenerationAt: Date | null;
  checkoutStartedAt: Date | null;
  paidAt: Date | null;
  currentStage: 'signup' | 'first_success' | 'checkout' | 'paid';
  acquisition: {
    source: string | null;
    utmCampaign: string | null;
    utmTerm: string | null;
    utmBatch: string | null;
    utmObjective: string | null;
    utmAdgroup: string | null;
    utmMatch: string | null;
    utmWorkflow: string | null;
    locale: string | null;
    utmLang: string | null;
    deviceType: string | null;
    utmDevice: string | null;
  } | null;
  paidOrder: {
    orderNo: string;
    productName: string | null;
    paymentAmount: number | null;
    paymentCurrency: string | null;
  } | null;
};

type AcquisitionSummary = {
  utmCampaign: string | null;
  utmAdgroup: string | null;
  utmWorkflow: string | null;
  utmMatch: string | null;
  countryCode: string | null;
  locale: string | null;
  utmLang: string | null;
  deviceType: string | null;
  utmDevice: string | null;
};

type PaidOrderTiming = {
  paidAt: Date | null;
  createdAt: Date;
};

export type AcquisitionBreakdownDimension =
  | 'campaign'
  | 'adgroup'
  | 'workflow'
  | 'match'
  | 'country'
  | 'language'
  | 'device';

export interface AcquisitionBreakdownStat {
  value: string;
  signups: number;
  firstSuccessfulGenerations: number;
  checkoutStarts: number;
  paidUsers: number;
  signupToFirstSuccessRate: number;
  firstSuccessToCheckoutRate: number;
  checkoutToPaidRate: number;
  signupToPaidRate: number;
}

export type AcquisitionDimensionBreakdownStats = Record<
  AcquisitionBreakdownDimension,
  AcquisitionBreakdownStat[]
>;

type AdminFunnelAnalytics<TStat> = {
  funnelStats: TStat[];
  acquisitionBreakdowns: AcquisitionDimensionBreakdownStats;
};

type CohortAnalyticsContext = {
  periodKeys: string[];
  journeys: FunnelJourney[];
  acquisitionByUserId: Map<string, AcquisitionSummary>;
};

export type DailyAdminFunnelAnalytics = AdminFunnelAnalytics<DailyFunnelStat>;
export type MonthlyAdminFunnelAnalytics =
  AdminFunnelAnalytics<MonthlyFunnelStat>;

function toDateKey(value: Date) {
  return value.toISOString().split('T')[0];
}

function createDateRange(days: number) {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const dateKeys: string[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    dateKeys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    startDate,
    endExclusive: new Date(endDate.getTime() + 1),
    dateKeys,
  };
}

export function resolvePaidOrderOccurredAt<T extends PaidOrderTiming>(value: T) {
  return value.paidAt ?? value.createdAt;
}

export function sortPaidOrdersByOccurredAt<T extends PaidOrderTiming>(
  rows: T[]
) {
  return [...rows].sort(
    (left, right) =>
      resolvePaidOrderOccurredAt(left).getTime() -
      resolvePaidOrderOccurredAt(right).getTime()
  );
}

export function buildPaidOrderOccurredOnOrAfterFilter(startDate: Date) {
  return or(
    gte(order.paidAt, startDate),
    and(isNull(order.paidAt), gte(order.createdAt, startDate))
  );
}

function logAdminFunnelError(
  step: string,
  metadata: Record<string, unknown>,
  error: unknown
): never {
  const details =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error;

  console.error('[admin-funnel]', {
    step,
    ...metadata,
    error: details,
  });

  throw error;
}

function resolveStageDates(journey: FunnelJourney) {
  const firstSuccessfulGenerationAt =
    journey.firstSuccessfulGenerationAt &&
    journey.firstSuccessfulGenerationAt >= journey.signupAt
      ? journey.firstSuccessfulGenerationAt
      : null;

  const checkoutStartedAt =
    firstSuccessfulGenerationAt &&
    journey.checkoutStartedAt &&
    journey.checkoutStartedAt >= firstSuccessfulGenerationAt
      ? journey.checkoutStartedAt
      : null;

  const paidAt =
    checkoutStartedAt && journey.paidAt && journey.paidAt >= checkoutStartedAt
      ? journey.paidAt
      : null;

  return {
    firstSuccessfulGenerationAt,
    checkoutStartedAt,
    paidAt,
  };
}

function pickFirstMomentAfter(
  moments: Date[],
  threshold: Date | null
): Date | null {
  if (!threshold) {
    return null;
  }

  return moments.find((moment) => moment >= threshold) || null;
}

function buildJourneyFromMoments(userId: string, moments: FunnelEventMoments) {
  const firstSuccessfulGenerationAt = pickFirstMomentAfter(
    moments.firstSuccessfulGenerationMoments,
    moments.signupAt
  );
  const checkoutStartedAt = pickFirstMomentAfter(
    moments.checkoutStartMoments,
    firstSuccessfulGenerationAt
  );
  const paidAt = pickFirstMomentAfter(moments.paidMoments, checkoutStartedAt);

  return {
    userId,
    signupAt: moments.signupAt,
    firstSuccessfulGenerationAt,
    checkoutStartedAt,
    paidAt,
  } satisfies FunnelJourney;
}

export function buildDailyCohortFunnelStats(params: {
  periodKeys: string[];
  journeys: FunnelJourney[];
}): DailyFunnelStat[] {
  const rows = new Map(
    params.periodKeys.map((date) => [
      date,
      {
        date,
        signups: 0,
        firstSuccessfulGenerations: 0,
        checkoutStarts: 0,
        paidUsers: 0,
        signupToFirstSuccessRate: 0,
        firstSuccessToCheckoutRate: 0,
        checkoutToPaidRate: 0,
        signupToPaidRate: 0,
      },
    ])
  );

  for (const journey of params.journeys) {
    const date = toDateKey(journey.signupAt);
    const row = rows.get(date);

    if (!row) {
      continue;
    }

    row.signups += 1;

    const stageDates = resolveStageDates(journey);

    if (stageDates.firstSuccessfulGenerationAt) {
      row.firstSuccessfulGenerations += 1;
    }

    if (stageDates.checkoutStartedAt) {
      row.checkoutStarts += 1;
    }

    if (stageDates.paidAt) {
      row.paidUsers += 1;
    }
  }

  return params.periodKeys.map((date) => {
    const row = rows.get(date)!;

    return {
      ...row,
      signupToFirstSuccessRate: calculateConversionRate(
        row.firstSuccessfulGenerations,
        row.signups
      ),
      firstSuccessToCheckoutRate: calculateConversionRate(
        row.checkoutStarts,
        row.firstSuccessfulGenerations
      ),
      checkoutToPaidRate: calculateConversionRate(
        row.paidUsers,
        row.checkoutStarts
      ),
      signupToPaidRate: calculateConversionRate(row.paidUsers, row.signups),
    };
  });
}

function createEmptyAcquisitionBreakdownRow(
  value: string
): AcquisitionBreakdownStat {
  return {
    value,
    signups: 0,
    firstSuccessfulGenerations: 0,
    checkoutStarts: 0,
    paidUsers: 0,
    signupToFirstSuccessRate: 0,
    firstSuccessToCheckoutRate: 0,
    checkoutToPaidRate: 0,
    signupToPaidRate: 0,
  };
}

function finalizeAcquisitionBreakdownRow(
  row: AcquisitionBreakdownStat
): AcquisitionBreakdownStat {
  return {
    ...row,
    signupToFirstSuccessRate: calculateConversionRate(
      row.firstSuccessfulGenerations,
      row.signups
    ),
    firstSuccessToCheckoutRate: calculateConversionRate(
      row.checkoutStarts,
      row.firstSuccessfulGenerations
    ),
    checkoutToPaidRate: calculateConversionRate(
      row.paidUsers,
      row.checkoutStarts
    ),
    signupToPaidRate: calculateConversionRate(row.paidUsers, row.signups),
  };
}

function sortAcquisitionBreakdownStats(rows: AcquisitionBreakdownStat[]) {
  return rows.sort((a, b) => {
    if (b.signups !== a.signups) {
      return b.signups - a.signups;
    }

    if (b.paidUsers !== a.paidUsers) {
      return b.paidUsers - a.paidUsers;
    }

    return a.value.localeCompare(b.value);
  });
}

function resolveLanguageBreakdownValue(
  value: AcquisitionSummary | undefined
): string | null | undefined {
  return value?.utmLang || value?.locale;
}

function resolveDeviceBreakdownValue(
  value: AcquisitionSummary | undefined
): string | null | undefined {
  return value?.utmDevice || value?.deviceType;
}

export function buildAcquisitionDimensionBreakdownStats(params: {
  journeys: FunnelJourney[];
  acquisitionByUserId: Map<string, AcquisitionSummary>;
}): AcquisitionDimensionBreakdownStats {
  const dimensionAccessors: Record<
    AcquisitionBreakdownDimension,
    (value: AcquisitionSummary | undefined) => string | null | undefined
  > = {
    campaign: (value) => value?.utmCampaign,
    adgroup: (value) => value?.utmAdgroup,
    workflow: (value) => value?.utmWorkflow,
    match: (value) => value?.utmMatch,
    country: (value) => value?.countryCode,
    language: resolveLanguageBreakdownValue,
    device: resolveDeviceBreakdownValue,
  };

  const breakdownMaps = {
    campaign: new Map<string, AcquisitionBreakdownStat>(),
    adgroup: new Map<string, AcquisitionBreakdownStat>(),
    workflow: new Map<string, AcquisitionBreakdownStat>(),
    match: new Map<string, AcquisitionBreakdownStat>(),
    country: new Map<string, AcquisitionBreakdownStat>(),
    language: new Map<string, AcquisitionBreakdownStat>(),
    device: new Map<string, AcquisitionBreakdownStat>(),
  } satisfies Record<
    AcquisitionBreakdownDimension,
    Map<string, AcquisitionBreakdownStat>
  >;

  for (const journey of params.journeys) {
    const acquisition = params.acquisitionByUserId.get(journey.userId);
    const stageDates = resolveStageDates(journey);

    for (const [dimension, accessor] of Object.entries(
      dimensionAccessors
    ) as Array<
      [
        AcquisitionBreakdownDimension,
        (value: AcquisitionSummary | undefined) => string | null | undefined,
      ]
    >) {
      const rawValue = accessor(acquisition);
      const value = rawValue?.trim() || '(unattributed)';
      const rows = breakdownMaps[dimension];
      const current = rows.get(value) || createEmptyAcquisitionBreakdownRow(value);

      current.signups += 1;

      if (stageDates.firstSuccessfulGenerationAt) {
        current.firstSuccessfulGenerations += 1;
      }

      if (stageDates.checkoutStartedAt) {
        current.checkoutStarts += 1;
      }

      if (stageDates.paidAt) {
        current.paidUsers += 1;
      }

      rows.set(value, current);
    }
  }

  return {
    campaign: sortAcquisitionBreakdownStats(
      Array.from(breakdownMaps.campaign.values()).map(
        finalizeAcquisitionBreakdownRow
      )
    ),
    adgroup: sortAcquisitionBreakdownStats(
      Array.from(breakdownMaps.adgroup.values()).map(
        finalizeAcquisitionBreakdownRow
      )
    ),
    workflow: sortAcquisitionBreakdownStats(
      Array.from(breakdownMaps.workflow.values()).map(
        finalizeAcquisitionBreakdownRow
      )
    ),
    match: sortAcquisitionBreakdownStats(
      Array.from(breakdownMaps.match.values()).map(
        finalizeAcquisitionBreakdownRow
      )
    ),
    country: sortAcquisitionBreakdownStats(
      Array.from(breakdownMaps.country.values()).map(
        finalizeAcquisitionBreakdownRow
      )
    ),
    language: sortAcquisitionBreakdownStats(
      Array.from(breakdownMaps.language.values()).map(
        finalizeAcquisitionBreakdownRow
      )
    ),
    device: sortAcquisitionBreakdownStats(
      Array.from(breakdownMaps.device.values()).map(
        finalizeAcquisitionBreakdownRow
      )
    ),
  };
}

function buildMonthlyCohortFunnelStats(dailyStats: DailyFunnelStat[]) {
  const monthlyMap = new Map<string, MonthlyFunnelStat>();

  for (const day of dailyStats) {
    const month = day.date.slice(0, 7);
    const current = monthlyMap.get(month) || {
      month,
      signups: 0,
      firstSuccessfulGenerations: 0,
      checkoutStarts: 0,
      paidUsers: 0,
      signupToFirstSuccessRate: 0,
      firstSuccessToCheckoutRate: 0,
      checkoutToPaidRate: 0,
      signupToPaidRate: 0,
    };

    current.signups += day.signups;
    current.firstSuccessfulGenerations += day.firstSuccessfulGenerations;
    current.checkoutStarts += day.checkoutStarts;
    current.paidUsers += day.paidUsers;
    monthlyMap.set(month, current);
  }

  return Array.from(monthlyMap.values())
    .map((row) => ({
      ...row,
      signupToFirstSuccessRate: calculateConversionRate(
        row.firstSuccessfulGenerations,
        row.signups
      ),
      firstSuccessToCheckoutRate: calculateConversionRate(
        row.checkoutStarts,
        row.firstSuccessfulGenerations
      ),
      checkoutToPaidRate: calculateConversionRate(
        row.paidUsers,
        row.checkoutStarts
      ),
      signupToPaidRate: calculateConversionRate(row.paidUsers, row.signups),
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

async function getCohortJourneys(startDate: Date, endExclusive: Date) {
  try {
    const signups = await db()
      .select({
        userId: user.id,
        signupAt: user.createdAt,
      })
      .from(user)
      .where(
        and(gte(user.createdAt, startDate), lt(user.createdAt, endExclusive))
      );

    if (signups.length === 0) {
      return [];
    }

    const userIds = signups.map((item) => item.userId);

    const [funnelEvents, paidOrders] = await Promise.all([
      db()
        .select({
          userId: userContextEvent.userId,
          eventType: userContextEvent.eventType,
          occurredAt: userContextEvent.createdAt,
        })
        .from(userContextEvent)
        .where(
          and(
            inArray(userContextEvent.userId, userIds),
            inArray(userContextEvent.eventType, [
              FIRST_SUCCESSFUL_GENERATION_EVENT,
              CHECKOUT_STARTED_EVENT,
            ]),
            gte(userContextEvent.createdAt, startDate)
          )
        )
        .orderBy(userContextEvent.createdAt),

      db()
        .select({
          userId: order.userId,
          paidAt: order.paidAt,
          createdAt: order.createdAt,
        })
        .from(order)
        .where(
          and(
            inArray(order.userId, userIds),
            eq(order.status, OrderStatus.PAID),
            isNull(order.deletedAt),
            buildPaidOrderOccurredOnOrAfterFilter(startDate)
          )
        ),
    ]);

    const momentsByUser = new Map<string, FunnelEventMoments>();

    for (const signup of signups) {
      momentsByUser.set(signup.userId, {
        signupAt: signup.signupAt,
        firstSuccessfulGenerationMoments: [],
        checkoutStartMoments: [],
        paidMoments: [],
      });
    }

    for (const event of funnelEvents) {
      const moments = momentsByUser.get(event.userId);
      if (!moments || event.occurredAt < moments.signupAt) {
        continue;
      }

      if (event.eventType === FIRST_SUCCESSFUL_GENERATION_EVENT) {
        moments.firstSuccessfulGenerationMoments.push(event.occurredAt);
      }

      if (event.eventType === CHECKOUT_STARTED_EVENT) {
        moments.checkoutStartMoments.push(event.occurredAt);
      }
    }

    for (const paid of sortPaidOrdersByOccurredAt(paidOrders)) {
      const moments = momentsByUser.get(paid.userId);
      const occurredAt = resolvePaidOrderOccurredAt(paid);
      if (!moments || occurredAt < moments.signupAt) {
        continue;
      }

      moments.paidMoments.push(occurredAt);
    }

    return Array.from(momentsByUser.entries()).map(([userId, moments]) =>
      buildJourneyFromMoments(userId, moments)
    );
  } catch (error) {
    return logAdminFunnelError(
      'get_cohort_journeys',
      {
        startDate: startDate.toISOString(),
        endExclusive: endExclusive.toISOString(),
      },
      error
    );
  }
}

async function getAcquisitionSummariesByUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, AcquisitionSummary>();
  }

  try {
    const rows = await db()
      .select({
        userId: userAcquisition.userId,
        utmCampaign: userAcquisition.utmCampaign,
        utmAdgroup: userAcquisition.utmAdgroup,
        utmWorkflow: userAcquisition.utmWorkflow,
        utmMatch: userAcquisition.utmMatch,
        countryCode: userAcquisition.countryCode,
        locale: userAcquisition.locale,
        utmLang: userAcquisition.utmLang,
        deviceType: userAcquisition.deviceType,
        utmDevice: userAcquisition.utmDevice,
      })
      .from(userAcquisition)
      .where(inArray(userAcquisition.userId, userIds));

    return new Map(
      rows.map((row) => [
        row.userId,
        {
          utmCampaign: row.utmCampaign,
          utmAdgroup: row.utmAdgroup,
          utmWorkflow: row.utmWorkflow,
          utmMatch: row.utmMatch,
          countryCode: row.countryCode,
          locale: row.locale,
          utmLang: row.utmLang,
          deviceType: row.deviceType,
          utmDevice: row.utmDevice,
        },
      ])
    );
  } catch (error) {
    return logAdminFunnelError(
      'get_acquisition_summaries',
      {
        userCount: userIds.length,
      },
      error
    );
  }
}

async function getCohortAnalyticsContext(
  days: number,
  options?: {
    includeAcquisition?: boolean;
  }
): Promise<CohortAnalyticsContext> {
  const { startDate, endExclusive, dateKeys } = createDateRange(days);
  const journeys = await getCohortJourneys(startDate, endExclusive);
  const acquisitionByUserId = options?.includeAcquisition
    ? await getAcquisitionSummariesByUserIds(
        journeys.map((journey) => journey.userId)
      )
    : new Map<string, AcquisitionSummary>();

  return {
    periodKeys: dateKeys,
    journeys,
    acquisitionByUserId,
  };
}

async function getDailyCohortFunnelStatsInternal(days = 30) {
  const { periodKeys, journeys } = await getCohortAnalyticsContext(days);

  return buildDailyCohortFunnelStats({
    periodKeys,
    journeys,
  });
}

export const getDailyCohortFunnelStats = unstable_cache(
  getDailyCohortFunnelStatsInternal,
  ['admin-daily-cohort-funnel-stats'],
  {
    revalidate: ADMIN_FUNNEL_REVALIDATE,
  }
);

async function getMonthlyCohortFunnelStatsInternal(months = 12) {
  return (await getMonthlyAdminFunnelAnalyticsInternal(months)).funnelStats;
}

export const getMonthlyCohortFunnelStats = unstable_cache(
  getMonthlyCohortFunnelStatsInternal,
  ['admin-monthly-cohort-funnel-stats'],
  {
    revalidate: ADMIN_FUNNEL_REVALIDATE,
  }
);

async function getDailyAcquisitionBreakdownStatsInternal(days = 30) {
  const { journeys, acquisitionByUserId } = await getCohortAnalyticsContext(
    days,
    {
      includeAcquisition: true,
    }
  );

  return buildAcquisitionDimensionBreakdownStats({
    journeys,
    acquisitionByUserId,
  });
}

export const getDailyAcquisitionBreakdownStats = unstable_cache(
  getDailyAcquisitionBreakdownStatsInternal,
  ['admin-daily-acquisition-breakdown-stats'],
  {
    revalidate: ADMIN_FUNNEL_REVALIDATE,
  }
);

async function getMonthlyAcquisitionBreakdownStatsInternal(months = 12) {
  return (await getMonthlyAdminFunnelAnalyticsInternal(months))
    .acquisitionBreakdowns;
}

export const getMonthlyAcquisitionBreakdownStats = unstable_cache(
  getMonthlyAcquisitionBreakdownStatsInternal,
  ['admin-monthly-acquisition-breakdown-stats'],
  {
    revalidate: ADMIN_FUNNEL_REVALIDATE,
  }
);

async function getDailyAdminFunnelAnalyticsInternal(
  days = 30
): Promise<DailyAdminFunnelAnalytics> {
  const { periodKeys, journeys, acquisitionByUserId } =
    await getCohortAnalyticsContext(days, {
      includeAcquisition: true,
    });

  return {
    funnelStats: buildDailyCohortFunnelStats({
      periodKeys,
      journeys,
    }),
    acquisitionBreakdowns: buildAcquisitionDimensionBreakdownStats({
      journeys,
      acquisitionByUserId,
    }),
  };
}

export const getDailyAdminFunnelAnalytics = unstable_cache(
  getDailyAdminFunnelAnalyticsInternal,
  ['admin-daily-funnel-analytics'],
  {
    revalidate: ADMIN_FUNNEL_REVALIDATE,
  }
);

async function getMonthlyAdminFunnelAnalyticsInternal(
  months = 12
): Promise<MonthlyAdminFunnelAnalytics> {
  const { periodKeys, journeys, acquisitionByUserId } =
    await getCohortAnalyticsContext(months * 31, {
      includeAcquisition: true,
    });
  const dailyStats = buildDailyCohortFunnelStats({
    periodKeys,
    journeys,
  });

  return {
    funnelStats: buildMonthlyCohortFunnelStats(dailyStats),
    acquisitionBreakdowns: buildAcquisitionDimensionBreakdownStats({
      journeys,
      acquisitionByUserId,
    }),
  };
}

export const getMonthlyAdminFunnelAnalytics = unstable_cache(
  getMonthlyAdminFunnelAnalyticsInternal,
  ['admin-monthly-funnel-analytics'],
  {
    revalidate: ADMIN_FUNNEL_REVALIDATE,
  }
);

export async function getUserFunnelSnapshot(
  userId: string,
  signupAt: Date
): Promise<UserFunnelSnapshot> {
  try {
    const [contextEvents, paidOrders, acquisition] = await Promise.all([
      db()
        .select({
          eventType: userContextEvent.eventType,
          occurredAt: userContextEvent.createdAt,
        })
        .from(userContextEvent)
        .where(
          and(
            eq(userContextEvent.userId, userId),
            inArray(userContextEvent.eventType, [
              FIRST_SUCCESSFUL_GENERATION_EVENT,
              CHECKOUT_STARTED_EVENT,
            ])
          )
        )
        .orderBy(userContextEvent.createdAt),
      db()
        .select({
          orderNo: order.orderNo,
          productName: order.productName,
          paymentAmount: order.paymentAmount,
          paymentCurrency: order.paymentCurrency,
          paidAt: order.paidAt,
          createdAt: order.createdAt,
        })
        .from(order)
        .where(
          and(
            eq(order.userId, userId),
            eq(order.status, OrderStatus.PAID),
            isNull(order.deletedAt)
          )
        ),
      db()
        .select({
          source: userAcquisition.source,
          utmCampaign: userAcquisition.utmCampaign,
          utmTerm: userAcquisition.utmTerm,
          utmBatch: userAcquisition.utmBatch,
          utmObjective: userAcquisition.utmObjective,
          utmAdgroup: userAcquisition.utmAdgroup,
          utmMatch: userAcquisition.utmMatch,
          utmWorkflow: userAcquisition.utmWorkflow,
          locale: userAcquisition.locale,
          utmLang: userAcquisition.utmLang,
          deviceType: userAcquisition.deviceType,
          utmDevice: userAcquisition.utmDevice,
        })
        .from(userAcquisition)
        .where(eq(userAcquisition.userId, userId))
        .limit(1),
    ]);

    const moments: FunnelEventMoments = {
      signupAt,
      firstSuccessfulGenerationMoments: [],
      checkoutStartMoments: [],
      paidMoments: [],
    };

    for (const event of contextEvents) {
      if (event.eventType === FIRST_SUCCESSFUL_GENERATION_EVENT) {
        moments.firstSuccessfulGenerationMoments.push(event.occurredAt);
      }

      if (event.eventType === CHECKOUT_STARTED_EVENT) {
        moments.checkoutStartMoments.push(event.occurredAt);
      }
    }

    const sortedPaidOrders = sortPaidOrdersByOccurredAt(paidOrders);

    for (const paidOrder of sortedPaidOrders) {
      const occurredAt = resolvePaidOrderOccurredAt(paidOrder);
      if (occurredAt >= signupAt) {
        moments.paidMoments.push(occurredAt);
      }
    }

    const journey = buildJourneyFromMoments(userId, moments);
    const displayPaidOrder =
      sortedPaidOrders.find(
        (paidOrder) =>
          resolvePaidOrderOccurredAt(paidOrder).getTime() ===
          journey.paidAt?.getTime()
      ) ||
      sortedPaidOrders[0] ||
      null;
    const currentStage = journey.paidAt
      ? 'paid'
      : journey.checkoutStartedAt
        ? 'checkout'
        : journey.firstSuccessfulGenerationAt
          ? 'first_success'
          : 'signup';

    return {
      signupAt,
      firstSuccessfulGenerationAt: journey.firstSuccessfulGenerationAt || null,
      checkoutStartedAt: journey.checkoutStartedAt || null,
      paidAt: journey.paidAt || null,
      currentStage,
      acquisition: acquisition[0] || null,
      paidOrder: displayPaidOrder
        ? {
            orderNo: displayPaidOrder.orderNo,
            productName: displayPaidOrder.productName,
            paymentAmount: displayPaidOrder.paymentAmount,
            paymentCurrency: displayPaidOrder.paymentCurrency,
          }
        : null,
    };
  } catch (error) {
    return logAdminFunnelError(
      'get_user_funnel_snapshot',
      {
        userId,
        signupAt: signupAt.toISOString(),
      },
      error
    );
  }
}
