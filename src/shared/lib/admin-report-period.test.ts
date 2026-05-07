import { describe, expect, it } from 'vitest';

import {
  normalizeAdminReportTimezone,
  resolvePreviousCompleteAdminReportWindow,
} from './admin-report-period';

describe('admin report period helpers', () => {
  it('falls back to UTC when timezone is missing or invalid', () => {
    expect(normalizeAdminReportTimezone()).toBe('UTC');
    expect(normalizeAdminReportTimezone('')).toBe('UTC');
    expect(normalizeAdminReportTimezone('Invalid/Timezone')).toBe('UTC');
    expect(normalizeAdminReportTimezone('Asia/Shanghai')).toBe(
      'Asia/Shanghai'
    );
  });

  it('resolves the previous complete daily window in Asia/Shanghai', () => {
    const window = resolvePreviousCompleteAdminReportWindow({
      frequency: 'daily',
      now: new Date('2026-05-06T10:30:00.000Z'),
      timezone: 'Asia/Shanghai',
    });

    expect(window.frequency).toBe('daily');
    expect(window.timezone).toBe('Asia/Shanghai');
    expect(window.periodKey).toBe('2026-05-05');
    expect(window.label).toBe('2026-05-05');
    expect(window.startAt.toISOString()).toBe('2026-05-04T16:00:00.000Z');
    expect(window.endAt.toISOString()).toBe('2026-05-05T16:00:00.000Z');
    expect(window.previousPeriodKey).toBe('2026-05-04');
    expect(window.previousStartAt.toISOString()).toBe(
      '2026-05-03T16:00:00.000Z'
    );
    expect(window.previousEndAt.toISOString()).toBe(
      '2026-05-04T16:00:00.000Z'
    );
  });

  it('resolves the previous complete ISO week window in Asia/Shanghai', () => {
    const window = resolvePreviousCompleteAdminReportWindow({
      frequency: 'weekly',
      now: new Date('2026-05-06T10:30:00.000Z'),
      timezone: 'Asia/Shanghai',
    });

    expect(window.frequency).toBe('weekly');
    expect(window.periodKey).toBe('2026-W18');
    expect(window.label).toBe('2026-04-27 to 2026-05-03');
    expect(window.startAt.toISOString()).toBe('2026-04-26T16:00:00.000Z');
    expect(window.endAt.toISOString()).toBe('2026-05-03T16:00:00.000Z');
    expect(window.previousPeriodKey).toBe('2026-W17');
    expect(window.previousStartAt.toISOString()).toBe(
      '2026-04-19T16:00:00.000Z'
    );
    expect(window.previousEndAt.toISOString()).toBe(
      '2026-04-26T16:00:00.000Z'
    );
  });

  it('resolves the previous complete month window in Asia/Shanghai', () => {
    const window = resolvePreviousCompleteAdminReportWindow({
      frequency: 'monthly',
      now: new Date('2026-05-06T10:30:00.000Z'),
      timezone: 'Asia/Shanghai',
    });

    expect(window.frequency).toBe('monthly');
    expect(window.periodKey).toBe('2026-04');
    expect(window.label).toBe('2026-04');
    expect(window.startAt.toISOString()).toBe('2026-03-31T16:00:00.000Z');
    expect(window.endAt.toISOString()).toBe('2026-04-30T16:00:00.000Z');
    expect(window.previousPeriodKey).toBe('2026-03');
    expect(window.previousStartAt.toISOString()).toBe(
      '2026-02-28T16:00:00.000Z'
    );
    expect(window.previousEndAt.toISOString()).toBe(
      '2026-03-31T16:00:00.000Z'
    );
  });
});
