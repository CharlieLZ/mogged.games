import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
}));

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  getGuestCreditsConsumedByDate: vi.fn(),
}));

vi.mock('@/core/db', () => ({
  db: mocks.db,
}));

vi.mock('@/shared/models/guest_ai_task', () => ({
  getGuestCreditsConsumedByDate: mocks.getGuestCreditsConsumedByDate,
}));

import { getDailyStats, getMonthlyStats, getWeeklyStats } from './admin-daily';

function createGroupedSelectResult(rows: Array<Record<string, unknown>>) {
  const query = {
    where: vi.fn(() => query),
    groupBy: vi.fn().mockResolvedValue(rows),
  };

  return {
    from: vi.fn(() => query),
  };
}

function primeDailyStatsDb() {
  const select = vi
    .fn()
    .mockImplementationOnce(() =>
      createGroupedSelectResult([{ date: '2026-05-04', count: 2 }])
    )
    .mockImplementationOnce(() =>
      createGroupedSelectResult([{ date: '2026-05-04', total: 19900 }])
    )
    .mockImplementationOnce(() =>
      createGroupedSelectResult([{ date: '2026-05-04', total: 9900 }])
    )
    .mockImplementationOnce(() =>
      createGroupedSelectResult([{ date: '2026-05-04', total: -4 }])
    )
    .mockImplementationOnce(() =>
      createGroupedSelectResult([{ date: '2026-05-04', total: 20 }])
    )
    .mockImplementationOnce(() =>
      createGroupedSelectResult([{ date: '2026-05-04', count: 3 }])
    );

  mocks.db.mockReturnValue({
    select,
  });
}

describe('admin daily stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds guest quota cost into total credits while keeping a separate guest breakdown', async () => {
    primeDailyStatsDb();
    mocks.getGuestCreditsConsumedByDate.mockResolvedValue([
      {
        date: '2026-05-04',
        total: 12,
      },
    ]);

    const stats = await getDailyStats(1);

    expect(stats).toEqual([
      {
        date: '2026-05-04',
        users: 2,
        payments: 19900,
        subscriptions: 9900,
        creditsConsumed: 16,
        guestCreditsConsumed: 12,
        creditsGranted: 20,
        orders: 3,
      },
    ]);
  });

  it('rolls guest quota cost into weekly totals', async () => {
    primeDailyStatsDb();
    mocks.getGuestCreditsConsumedByDate.mockResolvedValue([
      {
        date: '2026-05-04',
        total: 12,
      },
    ]);

    const stats = await getWeeklyStats(1);

    expect(stats).toContainEqual(
      expect.objectContaining({
        creditsConsumed: 16,
        guestCreditsConsumed: 12,
      })
    );
  });

  it('rolls guest quota cost into monthly totals', async () => {
    primeDailyStatsDb();
    mocks.getGuestCreditsConsumedByDate.mockResolvedValue([
      {
        date: '2026-05-04',
        total: 12,
      },
    ]);

    const stats = await getMonthlyStats(1);

    expect(stats).toContainEqual(
      expect.objectContaining({
        month: '2026-05',
        creditsConsumed: 16,
        guestCreditsConsumed: 12,
      })
    );
  });
});
