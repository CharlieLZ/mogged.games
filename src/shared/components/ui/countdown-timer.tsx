'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import {
  type CountdownSnapshot,
  getCountdownSnapshot,
  getNextCountdownDelay,
} from '@/shared/lib/countdown';
import { cn } from '@/shared/lib/utils';

interface CountdownTimerProps {
  endDate: Date;
  className?: string;
  onExpire?: () => void;
  variant?: 'inline' | 'segments';
}

export function CountdownTimer({
  endDate,
  className = '',
  onExpire,
  variant = 'inline',
}: CountdownTimerProps) {
  const [snapshot, setSnapshot] = useState<CountdownSnapshot | null>(null);
  const notifyExpire = useEffectEvent(() => {
    onExpire?.();
  });

  useEffect(() => {
    let timeoutId: number | null = null;
    let cancelled = false;

    const updateSnapshot = () => {
      if (cancelled) {
        return;
      }

      const nextSnapshot = getCountdownSnapshot(endDate);
      setSnapshot(nextSnapshot);

      if (nextSnapshot.expired) {
        notifyExpire();
        return;
      }

      const nextDelay = getNextCountdownDelay(nextSnapshot.totalMs);
      if (nextDelay !== null) {
        timeoutId = window.setTimeout(updateSnapshot, nextDelay);
      }
    };

    updateSnapshot();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [endDate]);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  if (snapshot?.expired) return null;

  const hoursLabel = snapshot ? formatNumber(snapshot.hours) : '--';
  const minutesLabel = snapshot ? formatNumber(snapshot.minutes) : '--';
  const secondsLabel = snapshot ? formatNumber(snapshot.seconds) : '--';

  if (variant === 'segments') {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center gap-1 font-mono tabular-nums',
          className
        )}
      >
        {[hoursLabel, minutesLabel, secondsLabel].map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="bg-card text-card-foreground border-border shadow-xs flex min-w-[2.25rem] items-center justify-center rounded-md border px-2 py-1"
          >
            <span className="text-center text-sm font-semibold">
              {label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex min-w-[8rem] items-center justify-center gap-1 font-mono tabular-nums',
        className
      )}
    >
      <span className="min-w-[2ch] text-center text-lg font-semibold">
        {hoursLabel}
      </span>
      <span className="text-sm">:</span>
      <span className="min-w-[2ch] text-center text-lg font-semibold">
        {minutesLabel}
      </span>
      <span className="text-sm">:</span>
      <span className="min-w-[2ch] text-center text-lg font-semibold">
        {secondsLabel}
      </span>
    </div>
  );
}
