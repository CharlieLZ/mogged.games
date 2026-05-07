import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GUEST_DAILY_QUOTA_LIMIT } from '@/shared/lib/viewer-quota';

import { getGuestQuotaStatus } from './guest_daily_quota';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  envConfigs: {
    database_url: 'postgres://example.com/db',
  },
}));

vi.mock('@/core/db', () => ({
  db: mocks.db,
}));

vi.mock('@/config', () => ({
  envConfigs: mocks.envConfigs,
}));

function createAwaitableRows(rows: Array<Record<string, unknown>>) {
  const query = {
    for: vi.fn(() => query),
    then: (
      resolve: (value: Array<Record<string, unknown>>) => unknown,
      reject: (reason?: unknown) => unknown
    ) => Promise.resolve(rows).then(resolve, reject),
  };

  return query;
}

function createQuotaSelect(rows: Array<Record<string, unknown>>) {
  const query = createAwaitableRows(rows);
  const limit = vi.fn(() => query);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));

  return {
    select: vi.fn(() => ({ from })),
    limit,
    where,
    from,
  };
}

describe('guest daily quota model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.envConfigs.database_url = 'postgres://example.com/db';
  });

  it('returns the default guest quota without inserting a row for read-only status checks', async () => {
    const select = createQuotaSelect([]);
    const insert = vi.fn();
    mocks.db.mockReturnValue({
      select: select.select,
      insert,
    });

    await expect(
      getGuestQuotaStatus(
        {
          guestIdHash: 'guest-hash',
          ipHash: 'ip-hash',
          userAgentHash: 'ua-hash',
        },
        new Date('2026-05-03T12:00:00.000Z')
      )
    ).resolves.toEqual({
      dateKey: '2026-05-03',
      limit: GUEST_DAILY_QUOTA_LIMIT,
      used: 0,
      reserved: 0,
      remaining: GUEST_DAILY_QUOTA_LIMIT,
    });

    expect(insert).not.toHaveBeenCalled();
  });

  it('falls back to the default guest quota when the optional quota table read hits a connectivity timeout', async () => {
    const limit = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('Failed query'), {
          cause: {
            code: 'CONNECT_TIMEOUT',
          },
        })
      );
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));

    mocks.db.mockReturnValue({
      select: vi.fn(() => ({ from })),
      insert: vi.fn(),
    });

    await expect(
      getGuestQuotaStatus(
        {
          guestIdHash: 'guest-hash',
          ipHash: 'ip-hash',
          userAgentHash: 'ua-hash',
        },
        new Date('2026-05-03T12:00:00.000Z')
      )
    ).resolves.toEqual({
      dateKey: '2026-05-03',
      limit: GUEST_DAILY_QUOTA_LIMIT,
      used: 0,
      reserved: 0,
      remaining: GUEST_DAILY_QUOTA_LIMIT,
    });
  });

  it('returns the default guest quota immediately when no database is configured', async () => {
    mocks.envConfigs.database_url = '';

    await expect(
      getGuestQuotaStatus(
        {
          guestIdHash: 'guest-hash',
          ipHash: 'ip-hash',
          userAgentHash: 'ua-hash',
        },
        new Date('2026-05-03T12:00:00.000Z')
      )
    ).resolves.toEqual({
      dateKey: '2026-05-03',
      limit: GUEST_DAILY_QUOTA_LIMIT,
      used: 0,
      reserved: 0,
      remaining: GUEST_DAILY_QUOTA_LIMIT,
    });

    expect(mocks.db).not.toHaveBeenCalled();
  });
});
