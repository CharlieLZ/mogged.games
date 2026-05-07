import { describe, expect, it } from 'vitest';

import { getCountdownSnapshot, getNextCountdownDelay } from './countdown';

describe('countdown helpers', () => {
  it('returns minute and second snapshot from remaining time', () => {
    const snapshot = getCountdownSnapshot(
      new Date('2026-03-24T12:10:15.450Z'),
      Date.parse('2026-03-24T12:08:10.125Z')
    );

    expect(snapshot).toEqual({
      totalMs: 125_325,
      hours: 0,
      minutes: 2,
      totalMinutes: 2,
      seconds: 5,
      expired: false,
    });
  });

  it('marks expired timers as zeroed snapshots', () => {
    const snapshot = getCountdownSnapshot(
      new Date('2026-03-24T12:00:00.000Z'),
      Date.parse('2026-03-24T12:00:00.100Z')
    );

    expect(snapshot).toEqual({
      totalMs: 0,
      hours: 0,
      minutes: 0,
      totalMinutes: 0,
      seconds: 0,
      expired: true,
    });
  });

  it('aligns the next tick to the next whole second', () => {
    expect(getNextCountdownDelay(61_250)).toBe(250);
    expect(getNextCountdownDelay(61_000)).toBe(1_000);
    expect(getNextCountdownDelay(0)).toBeNull();
  });
});
