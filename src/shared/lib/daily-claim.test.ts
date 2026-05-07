import { describe, expect, it } from 'vitest';

import {
  buildDailyClaimTransactionNo,
  formatDailyClaimDateKey,
  getDailyClaimWindow,
  parseDailyClaimCreditsAmount,
} from './daily-claim';

describe('daily claim helpers', () => {
  const targetDate = new Date('2026-03-25T13:42:59.000Z');

  it('builds a stable day key', () => {
    expect(formatDailyClaimDateKey(targetDate)).toBe('2026-03-25');
  });

  it('returns the start and end bounds for the claim day', () => {
    const window = getDailyClaimWindow(targetDate);

    expect(window.dateKey).toBe('2026-03-25');
    expect(window.start.getHours()).toBe(0);
    expect(window.start.getMinutes()).toBe(0);
    expect(window.start.getSeconds()).toBe(0);
    expect(window.start.getMilliseconds()).toBe(0);
    expect(window.end.getTime() - window.start.getTime()).toBe(
      24 * 60 * 60 * 1000
    );
    expect(formatDailyClaimDateKey(window.start)).toBe('2026-03-25');
  });

  it('uses a deterministic transaction number per user and day', () => {
    expect(buildDailyClaimTransactionNo('user-123', targetDate)).toBe(
      'daily_claim:2026-03-25:user-123'
    );
  });

  it('parses the configured daily claim credits amount with a safe fallback', () => {
    expect(parseDailyClaimCreditsAmount('5')).toBe(5);
    expect(parseDailyClaimCreditsAmount('0')).toBe(5);
    expect(parseDailyClaimCreditsAmount('')).toBe(5);
  });
});
