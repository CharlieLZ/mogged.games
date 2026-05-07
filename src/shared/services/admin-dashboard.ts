import {
  getDailyStats,
  getMonthlyStats,
  getWeeklyStats,
  type DailyStat,
  type MonthlyStat,
  type WeeklyStat,
} from '@/shared/models/admin-daily';
import {
  getDailyAdminFunnelAnalytics,
  getMonthlyAdminFunnelAnalytics,
  type AcquisitionDimensionBreakdownStats,
  type DailyAdminFunnelAnalytics,
  type MonthlyAdminFunnelAnalytics,
} from '@/shared/models/admin-funnel';
import {
  getAdminOverviewRecent,
  getAdminOverviewStats,
  type AdminOverviewRecent,
  type AdminOverviewStats,
} from '@/shared/models/admin-overview';

function serializeError(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause:
      error.cause instanceof Error
        ? {
            name: error.cause.name,
            message: error.cause.message,
          }
        : error.cause,
  };
}

async function resolveAdminSection<T>({
  section,
  fallback,
  load,
}: {
  section: string;
  fallback: T;
  load: () => Promise<T>;
}): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error('[admin-dashboard]', {
      section,
      error: serializeError(error),
    });

    return fallback;
  }
}

export function createEmptyAdminOverviewStats(): AdminOverviewStats {
  return {
    users: {
      last7Days: 0,
      last30Days: 0,
    },
    payments: {
      last7Days: 0,
      last30Days: 0,
    },
    subscriptions: {
      last7Days: 0,
      last30Days: 0,
    },
    credits: {
      last7Days: 0,
      last30Days: 0,
    },
    guestCreditsConsumed: {
      last7Days: 0,
      last30Days: 0,
    },
    creditsGranted: {
      last7Days: 0,
      last30Days: 0,
    },
  };
}

export function createEmptyAdminOverviewRecent(): AdminOverviewRecent {
  return {
    users: [],
    creditConsumes: [],
    ordersPaid: [],
    subscriptionsPaid: [],
    creditsGranted: [],
    guestCreditsConsumed: [],
  };
}

export function createEmptyAcquisitionBreakdowns(): AcquisitionDimensionBreakdownStats {
  return {
    campaign: [],
    adgroup: [],
    workflow: [],
    match: [],
    country: [],
    language: [],
    device: [],
  };
}

function createEmptyDailyAdminFunnelAnalytics(): DailyAdminFunnelAnalytics {
  return {
    funnelStats: [],
    acquisitionBreakdowns: createEmptyAcquisitionBreakdowns(),
  };
}

function createEmptyMonthlyAdminFunnelAnalytics(): MonthlyAdminFunnelAnalytics {
  return {
    funnelStats: [],
    acquisitionBreakdowns: createEmptyAcquisitionBreakdowns(),
  };
}

export async function getAdminOverviewPageData(): Promise<{
  stats: AdminOverviewStats;
  recent: AdminOverviewRecent;
}> {
  const [stats, recent] = await Promise.all([
    resolveAdminSection({
      section: 'overview-stats',
      fallback: createEmptyAdminOverviewStats(),
      load: () => getAdminOverviewStats(),
    }),
    resolveAdminSection({
      section: 'overview-recent',
      fallback: createEmptyAdminOverviewRecent(),
      load: () => getAdminOverviewRecent(),
    }),
  ]);

  return {
    stats,
    recent,
  };
}

export async function getAdminDailyPageData(days = 30): Promise<{
  dailyStats: DailyStat[];
  funnelStats: DailyAdminFunnelAnalytics['funnelStats'];
  acquisitionBreakdowns: AcquisitionDimensionBreakdownStats;
}> {
  const [dailyStats, adminFunnelAnalytics] = await Promise.all([
    resolveAdminSection({
      section: 'daily-stats',
      fallback: [] as DailyStat[],
      load: () => getDailyStats(days),
    }),
    resolveAdminSection({
      section: 'daily-funnel-analytics',
      fallback: createEmptyDailyAdminFunnelAnalytics(),
      load: () => getDailyAdminFunnelAnalytics(days),
    }),
  ]);

  return {
    dailyStats,
    funnelStats: adminFunnelAnalytics.funnelStats,
    acquisitionBreakdowns: adminFunnelAnalytics.acquisitionBreakdowns,
  };
}

export async function getAdminWeeklyPageData(weeks = 12): Promise<{
  weeklyStats: WeeklyStat[];
}> {
  const weeklyStats = await resolveAdminSection({
    section: 'weekly-stats',
    fallback: [] as WeeklyStat[],
    load: () => getWeeklyStats(weeks),
  });

  return {
    weeklyStats,
  };
}

export async function getAdminMonthlyPageData(months = 12): Promise<{
  monthlyStats: MonthlyStat[];
  funnelStats: MonthlyAdminFunnelAnalytics['funnelStats'];
  acquisitionBreakdowns: AcquisitionDimensionBreakdownStats;
}> {
  const [monthlyStats, adminFunnelAnalytics] = await Promise.all([
    resolveAdminSection({
      section: 'monthly-stats',
      fallback: [] as MonthlyStat[],
      load: () => getMonthlyStats(months),
    }),
    resolveAdminSection({
      section: 'monthly-funnel-analytics',
      fallback: createEmptyMonthlyAdminFunnelAnalytics(),
      load: () => getMonthlyAdminFunnelAnalytics(months),
    }),
  ]);

  return {
    monthlyStats,
    funnelStats: adminFunnelAnalytics.funnelStats,
    acquisitionBreakdowns: adminFunnelAnalytics.acquisitionBreakdowns,
  };
}
