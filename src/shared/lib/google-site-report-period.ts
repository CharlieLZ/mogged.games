import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import type { AdminReportFrequency } from './admin-report-period';

dayjs.extend(utc);
dayjs.extend(timezone);

export const GOOGLE_SITE_REPORT_TIMEZONE = 'America/Los_Angeles';

export type GoogleSiteReportRange = {
  label: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  googleTimeZone: string;
};

export function resolveGoogleSiteReportRange({
  frequency,
  now = new Date(),
}: {
  frequency: AdminReportFrequency;
  now?: Date;
}): GoogleSiteReportRange {
  const cursor = dayjs(now).tz(GOOGLE_SITE_REPORT_TIMEZONE).startOf('day');
  const dayCount =
    frequency === 'weekly' ? 7 : frequency === 'monthly' ? 30 : 1;
  const start = cursor.subtract(dayCount, 'day');
  const end = cursor.subtract(1, 'day');
  const label =
    frequency === 'weekly'
      ? '近 7 天'
      : frequency === 'monthly'
        ? '近 30 天最佳表现'
        : '近 24 小时';

  return {
    label,
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
    dayCount,
    googleTimeZone: GOOGLE_SITE_REPORT_TIMEZONE,
  };
}
