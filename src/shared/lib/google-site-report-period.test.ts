import { describe, expect, it } from 'vitest';

import { resolveGoogleSiteReportRange } from './google-site-report-period';

describe('google site report period', () => {
  it('uses the previous complete PT day for the daily range', () => {
    const range = resolveGoogleSiteReportRange({
      frequency: 'daily',
      now: new Date('2026-05-06T10:00:00.000Z'),
    });

    expect(range).toMatchObject({
      label: '近 24 小时',
      startDate: '2026-05-05',
      endDate: '2026-05-05',
      dayCount: 1,
      googleTimeZone: 'America/Los_Angeles',
    });
  });

  it('uses the latest seven complete PT days for the weekly range', () => {
    const range = resolveGoogleSiteReportRange({
      frequency: 'weekly',
      now: new Date('2026-05-06T10:00:00.000Z'),
    });

    expect(range).toMatchObject({
      label: '近 7 天',
      startDate: '2026-04-29',
      endDate: '2026-05-05',
      dayCount: 7,
      googleTimeZone: 'America/Los_Angeles',
    });
  });

  it('uses the latest thirty complete PT days for the monthly range', () => {
    const range = resolveGoogleSiteReportRange({
      frequency: 'monthly',
      now: new Date('2026-05-06T10:00:00.000Z'),
    });

    expect(range).toMatchObject({
      label: '近 30 天最佳表现',
      startDate: '2026-04-06',
      endDate: '2026-05-05',
      dayCount: 30,
      googleTimeZone: 'America/Los_Angeles',
    });
  });
});
