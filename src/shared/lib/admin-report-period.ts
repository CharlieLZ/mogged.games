import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

export const ADMIN_REPORT_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
] as const;

export type AdminReportFrequency = (typeof ADMIN_REPORT_FREQUENCIES)[number];

export type AdminReportWindow = {
  frequency: AdminReportFrequency;
  periodKey: string;
  previousPeriodKey: string;
  label: string;
  timezone: string;
  startAt: Date;
  endAt: Date;
  previousStartAt: Date;
  previousEndAt: Date;
};

const DEFAULT_ADMIN_REPORT_TIMEZONE = 'UTC';

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', {
      timeZone: value,
    }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeAdminReportTimezone(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return DEFAULT_ADMIN_REPORT_TIMEZONE;
  }

  return isValidTimeZone(normalized)
    ? normalized
    : DEFAULT_ADMIN_REPORT_TIMEZONE;
}

function toWindowDate(value: dayjs.Dayjs) {
  return value.utc().toDate();
}

function toDailyPeriodKey(value: dayjs.Dayjs) {
  return value.format('YYYY-MM-DD');
}

function toWeeklyPeriodKey(value: dayjs.Dayjs) {
  return `${value.isoWeekYear()}-W${String(value.isoWeek()).padStart(2, '0')}`;
}

function toWeeklyLabel(start: dayjs.Dayjs, endExclusive: dayjs.Dayjs) {
  return `${start.format('YYYY-MM-DD')} to ${endExclusive
    .subtract(1, 'day')
    .format('YYYY-MM-DD')}`;
}

function toMonthlyPeriodKey(value: dayjs.Dayjs) {
  return value.format('YYYY-MM');
}

export function resolvePreviousCompleteAdminReportWindow({
  frequency,
  now = new Date(),
  timezone = DEFAULT_ADMIN_REPORT_TIMEZONE,
}: {
  frequency: AdminReportFrequency;
  now?: Date;
  timezone?: string;
}): AdminReportWindow {
  const normalizedTimezone = normalizeAdminReportTimezone(timezone);
  const cursor = dayjs(now).tz(normalizedTimezone);

  if (frequency === 'daily') {
    const end = cursor.startOf('day');
    const start = end.subtract(1, 'day');
    const previousStart = start.subtract(1, 'day');

    return {
      frequency,
      periodKey: toDailyPeriodKey(start),
      previousPeriodKey: toDailyPeriodKey(previousStart),
      label: toDailyPeriodKey(start),
      timezone: normalizedTimezone,
      startAt: toWindowDate(start),
      endAt: toWindowDate(end),
      previousStartAt: toWindowDate(previousStart),
      previousEndAt: toWindowDate(start),
    };
  }

  if (frequency === 'weekly') {
    const end = cursor.startOf('isoWeek');
    const start = end.subtract(1, 'week');
    const previousStart = start.subtract(1, 'week');

    return {
      frequency,
      periodKey: toWeeklyPeriodKey(start),
      previousPeriodKey: toWeeklyPeriodKey(previousStart),
      label: toWeeklyLabel(start, end),
      timezone: normalizedTimezone,
      startAt: toWindowDate(start),
      endAt: toWindowDate(end),
      previousStartAt: toWindowDate(previousStart),
      previousEndAt: toWindowDate(start),
    };
  }

  const end = cursor.startOf('month');
  const start = end.subtract(1, 'month');
  const previousStart = start.subtract(1, 'month');

  return {
    frequency,
    periodKey: toMonthlyPeriodKey(start),
    previousPeriodKey: toMonthlyPeriodKey(previousStart),
    label: toMonthlyPeriodKey(start),
    timezone: normalizedTimezone,
    startAt: toWindowDate(start),
    endAt: toWindowDate(end),
    previousStartAt: toWindowDate(previousStart),
    previousEndAt: toWindowDate(start),
  };
}
