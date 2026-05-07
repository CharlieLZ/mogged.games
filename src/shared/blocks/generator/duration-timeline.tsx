'use client';

import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';

type DurationTimelineProps = {
  label: string;
  value: string;
  min: number;
  max: number;
  onValueChange: (value: string) => void;
  className?: string;
};

function clampDuration(value: string, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return max;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function DurationTimeline({
  label,
  value,
  min,
  max,
  onValueChange,
  className,
}: DurationTimelineProps) {
  const numericValue = clampDuration(value, min, max);
  const progress = ((numericValue - min) / (max - min)) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-foreground/85 text-sm font-semibold tracking-tight sm:text-base">
          {numericValue}s
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="relative h-5">
          <div
            aria-hidden="true"
            className="bg-border/75 absolute inset-x-0 top-1/2 h-px -translate-y-1/2 rounded-full"
          />
          <div
            aria-hidden="true"
            className="bg-foreground/65 absolute left-0 top-1/2 h-px -translate-y-1/2 rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div
            aria-hidden="true"
            className="bg-foreground ring-background absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full ring-2 shadow-sm"
            style={{ left: `calc(${progress}% - 0.4375rem)` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={numericValue}
            onChange={(event) => onValueChange(event.target.value)}
            aria-label={label}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>{min}s</span>
          <span>{max}s</span>
        </div>
      </div>
    </div>
  );
}
