import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dispatchAdminReportDigest: vi.fn(),
}));

vi.mock('@/shared/services/admin-report-dispatch', () => ({
  dispatchAdminReportDigest: mocks.dispatchAdminReportDigest,
}));

import {
  parseAdminReportNotifyArgs,
  runAdminReportNotify,
} from './admin-report-notify';

describe('admin report notify script', () => {
  beforeEach(() => {
    mocks.dispatchAdminReportDigest.mockReset();
  });

  it('parses frequency, timezone, now, and dry-run flags', () => {
    expect(
      parseAdminReportNotifyArgs([
        '--frequency=weekly',
        '--timezone=Asia/Shanghai',
        '--now=2026-05-06T00:10:00.000Z',
        '--dry-run',
      ])
    ).toMatchObject({
      frequency: 'weekly',
      timezone: 'Asia/Shanghai',
      now: new Date('2026-05-06T00:10:00.000Z'),
      dryRun: true,
    });
  });

  it('dispatches the requested report frequency', async () => {
    mocks.dispatchAdminReportDigest.mockResolvedValue({
      status: 'sent',
      frequency: 'monthly',
      periodKey: '2026-04',
    });

    const result = await runAdminReportNotify([
      '--frequency=monthly',
      '--timezone=Asia/Shanghai',
    ]);

    expect(mocks.dispatchAdminReportDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: 'monthly',
        timezone: 'Asia/Shanghai',
        dryRun: false,
      })
    );
    expect(result).toMatchObject({
      status: 'sent',
      frequency: 'monthly',
      periodKey: '2026-04',
    });
  });
});
