export interface CountdownSnapshot {
  totalMs: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  seconds: number;
  expired: boolean;
}

export function getCountdownSnapshot(
  endDate: Date,
  nowMs = Date.now()
): CountdownSnapshot {
  const totalMs = Math.max(endDate.getTime() - nowMs, 0);

  return {
    totalMs,
    hours: Math.floor(totalMs / 3_600_000),
    minutes: Math.floor((totalMs / 60_000) % 60),
    totalMinutes: Math.floor(totalMs / 60_000),
    seconds: Math.floor((totalMs / 1_000) % 60),
    expired: totalMs <= 0,
  };
}

export function getNextCountdownDelay(totalMs: number) {
  if (totalMs <= 0) {
    return null;
  }

  const remainder = totalMs % 1_000;
  return remainder === 0 ? 1_000 : remainder;
}
