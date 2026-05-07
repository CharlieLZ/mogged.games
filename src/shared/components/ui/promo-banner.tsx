'use client';

import {
  CircleCheckBig,
  Coins,
  Gift,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/lib/utils';

interface PromoBannerProps {
  quotaLabel: string;
  quotaSuffix?: string;
  quotaCurrent: number;
  quotaTotal: number;
  popoverTitle: string;
  popoverBody: string;
  popoverFooter: string;
  showPopover: boolean;
  className?: string;
  popoverAlign?: 'start' | 'center' | 'end';
}

const clampQuotaProgress = (quotaCurrent: number, quotaTotal: number) => {
  if (quotaTotal <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, quotaCurrent / quotaTotal));
};

const clampQuotaValue = (value: number, quotaTotal: number) => {
  if (quotaTotal <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(quotaTotal, value));
};

const floatingStarClassNames = [
  {
    className: '-top-0.5 left-[19%] size-2.5 opacity-75',
    animationDelay: '0ms',
  },
  {
    className: 'top-2 right-[18%] size-2 opacity-60',
    animationDelay: '280ms',
  },
  {
    className: 'bottom-0.5 left-[35%] size-1.5 opacity-50',
    animationDelay: '520ms',
  },
];

export function PromoBanner({
  quotaLabel,
  quotaSuffix,
  quotaCurrent,
  quotaTotal,
  popoverTitle,
  popoverBody,
  popoverFooter,
  showPopover,
  className,
  popoverAlign = 'center',
}: PromoBannerProps) {
  const previousQuotaRef = useRef(0);
  const [displayQuota, setDisplayQuota] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setDisplayQuota(quotaCurrent);
      previousQuotaRef.current = quotaCurrent;
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayQuota(quotaCurrent);
      previousQuotaRef.current = quotaCurrent;
      return;
    }

    const from = previousQuotaRef.current;
    const to = quotaCurrent;

    if (from === to) {
      setDisplayQuota(to);
      return;
    }

    const durationMs = 1100;
    const animationStart = window.performance.now();
    let animationFrame = 0;

    const tick = (timestamp: number) => {
      const elapsed = timestamp - animationStart;
      const progress = Math.min(1, elapsed / durationMs);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(from + (to - from) * easedProgress);

      setDisplayQuota(nextValue);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
        return;
      }

      previousQuotaRef.current = to;
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [quotaCurrent]);

  const displayedQuota = clampQuotaValue(displayQuota, quotaTotal);
  const progress = clampQuotaProgress(displayedQuota, quotaTotal);
  const formattedDisplayQuota = displayedQuota;
  const formattedRewardQuota = displayedQuota;
  const formattedQuotaTotal = Math.max(0, quotaTotal);
  const popoverPositionClassName =
    popoverAlign === 'start'
      ? 'left-0'
      : popoverAlign === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'left-1/2 -translate-x-1/2 max-sm:right-0 max-sm:left-auto max-sm:translate-x-0';
  const popoverArrowClassName =
    popoverAlign === 'start'
      ? 'left-5'
      : popoverAlign === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'left-1/2 -translate-x-1/2 max-sm:right-5 max-sm:left-auto max-sm:translate-x-0';

  return (
    <div
      data-slot="promo-banner-root"
      className={cn('relative inline-flex max-w-full', className)}
      aria-live="polite"
    >
      <div
        data-slot="promo-banner-pill"
        aria-label={`${quotaLabel}: ${formattedDisplayQuota}/${formattedQuotaTotal}`}
        className="border-border/70 bg-card/94 supports-[backdrop-filter]:bg-card/82 relative flex min-w-0 max-w-full items-center gap-1.5 rounded-full border px-2 py-1.5 shadow-sm shadow-foreground/8 ring-1 ring-background/80 backdrop-blur sm:gap-2"
      >
        <div
          data-slot="promo-banner-icon"
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/18"
        >
          <Coins className="size-3" />
        </div>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span className="max-w-[7.5rem] truncate text-xs font-medium text-foreground sm:max-w-none">
            {quotaLabel}
          </span>
          <span className="flex shrink-0 items-baseline gap-0.5 text-xs tabular-nums sm:text-sm">
            <span
              data-slot="promo-banner-quota-current"
              className="text-primary font-semibold"
            >
              {formattedDisplayQuota}
            </span>
            <span
              data-slot="promo-banner-quota-divider"
              className="text-muted-foreground font-medium"
            >
              /
            </span>
            <span
              data-slot="promo-banner-quota-total"
              className="text-muted-foreground font-medium"
            >
              {formattedQuotaTotal}
            </span>
          </span>
          <div
            data-slot="promo-banner-progress"
            aria-hidden="true"
            className="bg-muted hidden h-1 w-8 overflow-hidden rounded-full sm:block"
          >
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          {quotaSuffix ? (
            <span
              data-slot="promo-banner-suffix"
              className="text-muted-foreground hidden shrink-0 text-xs font-medium sm:inline"
            >
              {quotaSuffix}
            </span>
          ) : null}
        </div>
        <div
          data-slot="promo-banner-spark"
          aria-hidden
          className={cn(
            'text-primary hidden size-6 shrink-0 items-center justify-center rounded-full border border-primary/18 bg-primary/8 sm:flex',
            showPopover ? 'motion-safe:animate-pulse' : ''
          )}
        >
          <Sparkles className="size-3" />
        </div>
      </div>

      {showPopover ? (
        <div
          data-slot="promo-banner-popover"
          className={cn(
            'pointer-events-none absolute top-[calc(100%+0.65rem)] z-20 w-[min(20rem,calc(100vw-1rem))] origin-top',
            popoverPositionClassName
          )}
        >
          <div
            data-slot="promo-banner-popover-arrow"
            aria-hidden
            className={cn(
              'absolute -top-2 h-4 w-4',
              popoverArrowClassName
            )}
          >
            <div
              data-slot="promo-banner-popover-arrow-shape"
              className="size-full border-t border-l border-border/70 bg-primary shadow-sm shadow-foreground/10 motion-safe:animate-promo-arrow-bounce"
            />
          </div>
          <div
            data-slot="promo-banner-popover-card"
            className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xl shadow-foreground/10 ring-1 ring-background/75 motion-safe:animate-promo-pop-in"
          >
            <div
              data-slot="promo-banner-popover-hero"
              className="relative overflow-hidden bg-primary px-4 pt-3 pb-3 text-center text-primary-foreground"
            >
              <div className="absolute -left-8 bottom-0 size-16 rounded-full bg-primary-foreground/10" />
              <div className="absolute -right-6 -top-5 size-18 rounded-full bg-primary-foreground/10" />
              <div className="relative mx-auto max-w-[17rem]">
                <div className="mx-auto mb-2 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/12 ring-1 ring-primary-foreground/18 motion-safe:animate-promo-coin-drop">
                  <Gift className="size-4.5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm leading-5 font-bold text-balance">
                    {popoverTitle}
                  </h2>
                  <p
                    data-slot="promo-banner-popover-body"
                    className="mx-auto mt-1.5 text-xs leading-4 text-primary-foreground/88"
                  >
                    {popoverBody}
                  </p>
                </div>
              </div>
            </div>
            <div
              data-slot="promo-banner-popover-content"
              className="bg-card px-4 pt-3 pb-3 text-center"
            >
              <div
                data-slot="promo-banner-reward"
                className="relative mx-auto flex max-w-[10rem] items-center justify-center gap-2 text-foreground"
              >
                {floatingStarClassNames.map((star, index) => (
                  <Sparkles
                    key={index}
                    data-slot="promo-banner-floating-star"
                    aria-hidden
                    className={cn(
                      'text-primary absolute motion-safe:animate-promo-star-float',
                      star.className
                    )}
                    style={{ animationDelay: star.animationDelay }}
                  />
                ))}
                <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/20 motion-safe:animate-pulse">
                  <Sparkles className="size-4" />
                </div>
                <div
                  data-slot="promo-banner-reward-count"
                  className="text-3xl leading-none font-bold tabular-nums text-foreground"
                >
                  {formattedRewardQuota}
                </div>
              </div>
              <div className="text-muted-foreground mt-1.5 text-xs font-medium">
                {quotaLabel}
              </div>
              <div className="bg-primary/8 mx-auto mt-3 flex size-8 items-center justify-center rounded-full text-primary motion-safe:animate-promo-check-pop">
                <CircleCheckBig className="size-4.5" />
              </div>
              <div className="bg-border/70 mt-3 h-px w-full" />
              <p className="text-primary mx-auto mt-2.5 flex max-w-[16rem] items-start justify-center gap-1.5 text-xs leading-4 font-semibold">
                <MessageCircle className="mt-0.5 size-4 shrink-0" />
                <span>{popoverFooter}</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
