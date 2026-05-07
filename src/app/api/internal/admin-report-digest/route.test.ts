import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_REPORT_FREQUENCIES } from '@/shared/lib/admin-report-period';

const mocks = vi.hoisted(() => ({
  dispatchAdminReportDigest: vi.fn(),
}));

vi.mock('@/shared/services/admin-report-dispatch', () => ({
  dispatchAdminReportDigest: mocks.dispatchAdminReportDigest,
}));

import { POST } from './route';
import { ADMIN_REPORT_DISPATCH_SECRET_HEADER } from '@/shared/lib/admin-report-cron-dispatch';

describe('/api/internal/admin-report-digest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = 'cron-secret';
    process.env.NEXTAUTH_SECRET = '';
  });

  it('rejects requests without the internal auth secret', async () => {
    const response = await POST(
      new Request('https://example.com/api/internal/admin-report-digest', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          scheduledTime: 1700000000000,
        }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: -1,
      message: 'Unauthorized',
    });
    expect(mocks.dispatchAdminReportDigest).not.toHaveBeenCalled();
  });

  it('dispatches every configured admin report frequency for the scheduled time', async () => {
    mocks.dispatchAdminReportDigest.mockImplementation(
      async ({
        frequency,
        now,
      }: {
        frequency: (typeof ADMIN_REPORT_FREQUENCIES)[number];
        now: Date;
      }) => ({
        status: 'sent',
        frequency,
        periodKey: `${frequency}-period`,
        timezone: 'UTC',
        deliveryRecordId: `${frequency}-record`,
        recipients: ['ops@mogged.games'],
        scheduledAt: now.toISOString(),
      })
    );

    const response = await POST(
      new Request('https://example.com/api/internal/admin-report-digest', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [ADMIN_REPORT_DISPATCH_SECRET_HEADER]: 'cron-secret',
        },
        body: JSON.stringify({
          scheduledTime: 1700000000000,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.dispatchAdminReportDigest).toHaveBeenCalledTimes(
      ADMIN_REPORT_FREQUENCIES.length
    );
    expect(
      mocks.dispatchAdminReportDigest.mock.calls.map(([arg]) => arg.frequency)
    ).toEqual(ADMIN_REPORT_FREQUENCIES);
    expect(
      mocks.dispatchAdminReportDigest.mock.calls.map(([arg]) =>
        arg.now.getTime()
      )
    ).toEqual([1700000000000, 1700000000000, 1700000000000]);
    await expect(response.json()).resolves.toMatchObject({
      code: 0,
      message: 'ok',
      data: {
        results: ADMIN_REPORT_FREQUENCIES.map((frequency) => ({
          status: 'sent',
          frequency,
        })),
      },
    });
  });

  it('returns 500 when a dispatch throws unexpectedly', async () => {
    mocks.dispatchAdminReportDigest.mockResolvedValueOnce({
      status: 'sent',
      frequency: 'daily',
      periodKey: 'daily-period',
      timezone: 'UTC',
      deliveryRecordId: 'daily-record',
      recipients: ['ops@mogged.games'],
    });
    mocks.dispatchAdminReportDigest.mockRejectedValueOnce(
      new Error('database unavailable')
    );

    const response = await POST(
      new Request('https://example.com/api/internal/admin-report-digest', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [ADMIN_REPORT_DISPATCH_SECRET_HEADER]: 'cron-secret',
        },
        body: JSON.stringify({
          scheduledTime: 1700000000000,
        }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: -1,
      message: 'admin report dispatch failed',
      data: {
        failedFrequency: 'weekly',
      },
    });
  });
});
