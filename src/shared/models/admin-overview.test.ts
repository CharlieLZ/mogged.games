import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAdminOverviewRecent,
  getAdminOverviewStats,
} from './admin-overview';

vi.mock('server-only', () => ({}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
}));

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  getGuestCreditsConsumedTotal: vi.fn(),
  findRecentGuestCostTasks: vi.fn(),
}));

vi.mock('@/core/db', () => ({
  db: mocks.db,
}));

vi.mock('./guest_ai_task', () => ({
  getGuestCreditsConsumedTotal: mocks.getGuestCreditsConsumedTotal,
  findRecentGuestCostTasks: mocks.findRecentGuestCostTasks,
}));

function createWhereSelectResult(rows: Array<Record<string, unknown>>) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(rows),
    })),
  };
}

function createOrderedSelectResult(
  rows: Array<Record<string, unknown>>,
  options: {
    hasWhere?: boolean;
  } = {}
) {
  const query = {
    orderBy: vi.fn(() => query),
    limit: vi.fn().mockResolvedValue(rows),
  } as {
    orderBy: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    where?: ReturnType<typeof vi.fn>;
  };

  if (options.hasWhere) {
    query.where = vi.fn(() => query);
  }

  return {
    from: vi.fn(() => query),
  };
}

function primeStatsDb() {
  const select = vi
    .fn()
    .mockImplementationOnce(() => createWhereSelectResult([{ count: 3 }]))
    .mockImplementationOnce(() => createWhereSelectResult([{ count: 8 }]))
    .mockImplementationOnce(() => createWhereSelectResult([{ total: 19900 }]))
    .mockImplementationOnce(() => createWhereSelectResult([{ total: 59900 }]))
    .mockImplementationOnce(() => createWhereSelectResult([{ total: 9900 }]))
    .mockImplementationOnce(() => createWhereSelectResult([{ total: 29900 }]))
    .mockImplementationOnce(() => createWhereSelectResult([{ total: -4 }]))
    .mockImplementationOnce(() => createWhereSelectResult([{ total: -10 }]))
    .mockImplementationOnce(() => createWhereSelectResult([{ total: 20 }]))
    .mockImplementationOnce(() => createWhereSelectResult([{ total: 55 }]));

  mocks.db.mockReturnValue({
    select,
  });
}

function primeRecentDb() {
  const select = vi
    .fn()
    .mockImplementationOnce(() =>
      createOrderedSelectResult([
        {
          id: 'user-1',
          name: 'Charlie',
          email: 'charlie@example.com',
          createdAt: new Date('2026-05-05T00:00:00.000Z'),
        },
      ])
    )
    .mockImplementationOnce(() =>
      createOrderedSelectResult(
        [
          {
            id: 'credit-1',
            transactionNo: 'txn-1',
            credits: -12,
            description: 'image generate',
            transactionScene: 'text-to-image',
            createdAt: new Date('2026-05-05T01:00:00.000Z'),
          },
        ],
        { hasWhere: true }
      )
    )
    .mockImplementationOnce(() =>
      createOrderedSelectResult(
        [
          {
            orderNo: 'order-1',
            amount: 9900,
            currency: 'usd',
            description: 'Starter plan',
            createdAt: new Date('2026-05-05T02:00:00.000Z'),
          },
        ],
        { hasWhere: true }
      )
    )
    .mockImplementationOnce(() =>
      createOrderedSelectResult(
        [
          {
            orderNo: 'sub-1',
            amount: 4900,
            currency: 'usd',
            description: 'Monthly plan',
            createdAt: new Date('2026-05-05T03:00:00.000Z'),
          },
        ],
        { hasWhere: true }
      )
    )
    .mockImplementationOnce(() =>
      createOrderedSelectResult(
        [
          {
            id: 'grant-1',
            transactionNo: 'grant-txn-1',
            credits: 20,
            description: 'promo grant',
            transactionScene: 'campaign',
            createdAt: new Date('2026-05-05T04:00:00.000Z'),
          },
        ],
        { hasWhere: true }
      )
    );

  mocks.db.mockReturnValue({
    select,
  });
}

describe('admin overview model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds guest quota cost into total credits while preserving a separate guest metric', async () => {
    primeStatsDb();
    mocks.getGuestCreditsConsumedTotal
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(30);

    await expect(getAdminOverviewStats()).resolves.toEqual({
      users: {
        last7Days: 3,
        last30Days: 8,
      },
      payments: {
        last7Days: 19900,
        last30Days: 59900,
      },
      subscriptions: {
        last7Days: 9900,
        last30Days: 29900,
      },
      credits: {
        last7Days: 16,
        last30Days: 40,
      },
      guestCreditsConsumed: {
        last7Days: 12,
        last30Days: 30,
      },
      creditsGranted: {
        last7Days: 20,
        last30Days: 55,
      },
    });
  });

  it('returns recent guest cost activity alongside existing overview feeds', async () => {
    const guestRecent = [
      {
        id: 'guest-task-1',
        guestIdHash: 'guest-hash-1',
        scene: 'image-to-image',
        provider: 'kie-market',
        providerTaskId: 'provider-task-1',
        quotaUnits: 12,
        createdAt: new Date('2026-05-05T05:00:00.000Z'),
      },
    ];

    primeRecentDb();
    mocks.findRecentGuestCostTasks.mockResolvedValue(guestRecent);

    await expect(getAdminOverviewRecent()).resolves.toEqual(
      expect.objectContaining({
        users: [
          expect.objectContaining({
            id: 'user-1',
            email: 'charlie@example.com',
          }),
        ],
        guestCreditsConsumed: guestRecent,
      })
    );
  });
});
