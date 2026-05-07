import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAdminOverviewStats: vi.fn(),
  getAdminOverviewRecent: vi.fn(),
  getDailyStats: vi.fn(),
  getWeeklyStats: vi.fn(),
  getMonthlyStats: vi.fn(),
  getDailyAdminFunnelAnalytics: vi.fn(),
  getMonthlyAdminFunnelAnalytics: vi.fn(),
}));

vi.mock('@/shared/models/admin-overview', () => ({
  getAdminOverviewStats: mocks.getAdminOverviewStats,
  getAdminOverviewRecent: mocks.getAdminOverviewRecent,
}));

vi.mock('@/shared/models/admin-daily', () => ({
  getDailyStats: mocks.getDailyStats,
  getWeeklyStats: mocks.getWeeklyStats,
  getMonthlyStats: mocks.getMonthlyStats,
}));

vi.mock('@/shared/models/admin-funnel', () => ({
  getDailyAdminFunnelAnalytics: mocks.getDailyAdminFunnelAnalytics,
  getMonthlyAdminFunnelAnalytics: mocks.getMonthlyAdminFunnelAnalytics,
}));

import {
  createEmptyAcquisitionBreakdowns,
  createEmptyAdminOverviewRecent,
  createEmptyAdminOverviewStats,
  getAdminDailyPageData,
  getAdminOverviewPageData,
  getAdminWeeklyPageData,
} from './admin-dashboard';

describe('admin dashboard service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns overview stats and recent activity when both loaders succeed', async () => {
    const stats = createEmptyAdminOverviewStats();
    const recent = createEmptyAdminOverviewRecent();

    stats.users.last7Days = 3;
    recent.users.push({
      id: 'user-1',
      name: 'Charlie',
      email: '[email protected]',
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
    });

    mocks.getAdminOverviewStats.mockResolvedValue(stats);
    mocks.getAdminOverviewRecent.mockResolvedValue(recent);

    await expect(getAdminOverviewPageData()).resolves.toEqual({
      stats,
      recent,
    });
  });

  it('keeps the overview page renderable when stats loading fails', async () => {
    const recent = createEmptyAdminOverviewRecent();
    recent.ordersPaid.push({
      orderNo: 'ord_1',
      amount: 9900,
      currency: 'usd',
      description: 'Starter plan',
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
    });

    mocks.getAdminOverviewStats.mockRejectedValue(new Error('stats failed'));
    mocks.getAdminOverviewRecent.mockResolvedValue(recent);

    await expect(getAdminOverviewPageData()).resolves.toEqual({
      stats: createEmptyAdminOverviewStats(),
      recent,
    });
    expect(console.error).toHaveBeenCalledWith(
      '[admin-dashboard]',
      expect.objectContaining({
        section: 'overview-stats',
      })
    );
  });

  it('returns empty funnel analytics instead of throwing when daily analytics fail', async () => {
    const dailyStats = [
      {
        date: '2026-04-16',
        users: 1,
        payments: 0,
        subscriptions: 0,
        creditsConsumed: 0,
        guestCreditsConsumed: 0,
        creditsGranted: 0,
        orders: 0,
      },
    ];

    mocks.getDailyStats.mockResolvedValue(dailyStats);
    mocks.getDailyAdminFunnelAnalytics.mockRejectedValue(
      new Error('daily analytics failed')
    );

    await expect(getAdminDailyPageData(30)).resolves.toEqual({
      dailyStats,
      funnelStats: [],
      acquisitionBreakdowns: createEmptyAcquisitionBreakdowns(),
    });
  });

  it('returns an empty weekly table when the weekly stats query fails', async () => {
    mocks.getWeeklyStats.mockRejectedValue(new Error('weekly failed'));

    await expect(getAdminWeeklyPageData(12)).resolves.toEqual({
      weeklyStats: [],
    });
  });
});
