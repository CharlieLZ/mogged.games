'use client';

import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { cn } from '@/shared/lib/utils';
import {
  BenefitReviewItem,
  Benefits as BenefitsType,
} from '@/shared/types/blocks/landing';

import { SectionIntro } from './section-intro';

const BENEFITS_REVIEW_AUTOPLAY_MS = 5000;
const MAX_REVIEW_STARS = 5;

function normalizeIndex(index: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  if (index < 0) {
    return total - 1;
  }

  if (index >= total) {
    return 0;
  }

  return index;
}

function clampRating(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  return Math.max(0, Math.min(MAX_REVIEW_STARS, Math.round(value)));
}

function hasRenderableReview(item: BenefitReviewItem) {
  return Boolean(
    item.title || item.role || item.quote || item.video?.src || item.image?.src
  );
}

function normalizeReviewItems(items?: BenefitReviewItem[]) {
  return (items ?? []).filter(hasRenderableReview).map((item) => ({
    ...item,
    rating: clampRating(item.rating),
  }));
}

function ReviewStars({ count, inverse }: { count?: number; inverse: boolean }) {
  const filledCount = clampRating(count) ?? 0;

  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`${filledCount} star review`}
    >
      {Array.from({ length: MAX_REVIEW_STARS }, (_, index) => {
        const isFilled = index < filledCount;

        return (
          <span
            key={`benefits-review-star-${index}`}
            data-slot="benefits-review-star"
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-md border transition-colors',
              isFilled
                ? inverse
                  ? 'border-background/12 bg-background/12 text-background'
                  : 'border-primary/20 bg-primary/10 text-primary'
                : inverse
                  ? 'border-background/10 text-background/28 bg-transparent'
                  : 'border-border/60 text-muted-foreground/45 bg-transparent'
            )}
          >
            <Star className="size-4 fill-current" />
          </span>
        );
      })}
    </div>
  );
}

function ReviewMedia({
  item,
  inverse,
  videoFailed,
  onVideoError,
}: {
  item: BenefitReviewItem;
  inverse: boolean;
  videoFailed: boolean;
  onVideoError: (src?: string) => void;
}) {
  if (item.video?.src && !videoFailed) {
    return (
      <video
        data-slot="benefits-review-video"
        suppressHydrationWarning
        className="block h-full w-full object-cover"
        src={item.video.src}
        poster={item.video.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => onVideoError(item.video?.src)}
      />
    );
  }

  return (
    <div
      data-slot="benefits-review-video-fallback"
      className={cn(
        'flex h-full w-full items-center justify-center px-6 text-center',
        inverse
          ? 'bg-background/6 text-background/62'
          : 'bg-muted/40 text-muted-foreground'
      )}
    >
      <div className="max-w-sm space-y-2">
        {item.title ? (
          <p className="text-sm font-semibold md:text-base">{item.title}</p>
        ) : null}
        {item.quote ? (
          <p className="text-sm leading-6 md:text-[15px]">{item.quote}</p>
        ) : null}
      </div>
    </div>
  );
}

function ReviewPanel({
  item,
  inverse,
  videoFailed,
  onVideoError,
}: {
  item: BenefitReviewItem;
  inverse: boolean;
  videoFailed: boolean;
  onVideoError: (src?: string) => void;
}) {
  return (
    <article
      data-slot="benefits-review-panel"
      className={cn(
        'overflow-hidden rounded-[2rem] border p-3 shadow-sm md:p-5',
        inverse
          ? 'border-background/10 bg-background/4 text-background'
          : 'border-border/60 bg-background/90 text-card-foreground'
      )}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center">
        <div
          className={cn(
            'overflow-hidden rounded-[1.55rem] border',
            inverse
              ? 'border-background/10 bg-background/6'
              : 'border-border/60 bg-background shadow-sm'
          )}
        >
          <div
            className={cn(
              'relative aspect-[16/10] overflow-hidden md:aspect-[16/9]',
              inverse ? 'bg-background/6' : 'bg-muted/30'
            )}
          >
            <ReviewMedia
              item={item}
              inverse={inverse}
              videoFailed={videoFailed}
              onVideoError={onVideoError}
            />
          </div>
        </div>

        <div
          className={cn(
            'rounded-[1.55rem] border px-5 py-5 md:px-6 md:py-6',
            inverse
              ? 'border-background/10 bg-background/6 text-background'
              : 'border-border/60 bg-card text-card-foreground'
          )}
        >
          <div className="flex items-center gap-3">
            {item.image?.src ? (
              <div
                className={cn(
                  'relative size-16 overflow-hidden rounded-full border shadow-sm',
                  inverse
                    ? 'border-background/12 bg-background/10'
                    : 'border-border/60 bg-muted/60'
                )}
              >
                <Image
                  data-slot="benefits-review-avatar"
                  src={item.image.src}
                  alt={item.image.alt || item.title || 'Reviewer avatar'}
                  fill
                  sizes="64px"
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              {item.title ? (
                <p className="text-lg font-semibold tracking-tight md:text-[1.85rem] md:leading-none">
                  {item.title}
                </p>
              ) : null}
              {item.role ? (
                <p
                  className={cn(
                    'mt-2 text-sm leading-6 md:text-[15px]',
                    inverse ? 'text-background/70' : 'text-muted-foreground'
                  )}
                >
                  {item.role}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            <ReviewStars count={item.rating} inverse={inverse} />
          </div>

          {item.quote ? (
            <blockquote
              className={cn(
                'mt-5 text-base leading-8 md:text-[1.05rem] md:leading-9',
                inverse ? 'text-background/90' : 'text-foreground'
              )}
            >
              {item.quote}
            </blockquote>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ReviewControlButton({
  direction,
  inverse,
  onClick,
}: {
  direction: 'previous' | 'next';
  inverse: boolean;
  onClick: () => void;
}) {
  const isPrevious = direction === 'previous';
  const Icon = isPrevious ? ChevronLeft : ChevronRight;

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      data-slot={
        isPrevious ? 'benefits-review-previous' : 'benefits-review-next'
      }
      aria-label={isPrevious ? 'Show previous review' : 'Show next review'}
      className={cn(
        'size-11 rounded-full border shadow-sm backdrop-blur transition-transform duration-200 hover:-translate-y-0.5',
        inverse
          ? 'border-background/12 bg-background/8 text-background hover:bg-background/14'
          : 'border-border/60 bg-background/90 text-foreground hover:bg-muted'
      )}
      onClick={onClick}
    >
      <Icon className="size-5 rtl:rotate-180" />
    </Button>
  );
}

export function BenefitsReviewCarousel({
  benefits,
  className,
}: {
  benefits: BenefitsType;
  className?: string;
}) {
  const items = useMemo(
    () => normalizeReviewItems(benefits.items),
    [benefits.items]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedVideoSources, setFailedVideoSources] = useState<string[]>([]);

  useEffect(() => {
    setActiveIndex((current) => normalizeIndex(current, items.length));
  }, [items.length]);

  const showControls = items.length > 1;
  const inverse = benefits.tone === 'inverse';

  const goToPrevious = useEffectEvent(() => {
    if (!showControls) {
      return;
    }

    setActiveIndex((current) => normalizeIndex(current - 1, items.length));
  });

  const goToNext = useEffectEvent(() => {
    if (!showControls) {
      return;
    }

    setActiveIndex((current) => normalizeIndex(current + 1, items.length));
  });

  const markVideoFailed = useEffectEvent((src?: string) => {
    if (!src) {
      return;
    }

    setFailedVideoSources((current) =>
      current.includes(src) ? current : [...current, src]
    );
  });

  useEffect(() => {
    if (!showControls) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      goToNext();
    }, BENEFITS_REVIEW_AUTOPLAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeIndex, goToNext, showControls]);

  const activeItem = items[normalizeIndex(activeIndex, items.length)];

  if (!activeItem) {
    return null;
  }

  const activeVideoSource = activeItem.video?.src;
  const activeVideoFailed = activeVideoSource
    ? failedVideoSources.includes(activeVideoSource)
    : false;

  return (
    <section
      data-slot="benefits-review-section"
      id={benefits.id}
      className={cn('py-12 md:py-16 lg:py-20', benefits.className, className)}
    >
      <div className="container">
        <div
          className={cn(
            'relative overflow-hidden rounded-[2rem] border px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12',
            inverse
              ? 'border-background/10 bg-background/4'
              : 'border-border/60 bg-background/85 shadow-sm'
          )}
        >
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-x-16 top-0 h-28 rounded-full blur-3xl',
              inverse ? 'bg-background/8' : 'bg-primary/6'
            )}
          />

          <ScrollAnimation>
            <SectionIntro
              tone={benefits.tone}
              label={benefits.label}
              title={benefits.title}
              description={benefits.description}
              className="relative mx-auto max-w-4xl"
              maxWidthClassName="max-w-4xl"
              titleClassName="text-[2rem] md:text-[2.75rem]"
            />
          </ScrollAnimation>

          <ScrollAnimation delay={0.15}>
            <div
              data-slot="benefits-review-viewport"
              className="relative mt-8 md:mt-10"
            >
              <ReviewPanel
                key={activeItem.video?.src || activeItem.title || activeIndex}
                item={activeItem}
                inverse={inverse}
                videoFailed={activeVideoFailed}
                onVideoError={markVideoFailed}
              />

              {showControls ? (
                <div className="mt-4 flex items-center justify-center gap-3 md:mt-0 md:block">
                  <div className="md:absolute md:top-1/2 md:left-0 md:-translate-x-1/2 md:-translate-y-1/2 rtl:md:right-0 rtl:md:left-auto rtl:md:translate-x-1/2">
                    <ReviewControlButton
                      direction="previous"
                      inverse={inverse}
                      onClick={goToPrevious}
                    />
                  </div>
                  <div className="md:absolute md:top-1/2 md:right-0 md:translate-x-1/2 md:-translate-y-1/2 rtl:md:right-auto rtl:md:left-0 rtl:md:-translate-x-1/2">
                    <ReviewControlButton
                      direction="next"
                      inverse={inverse}
                      onClick={goToNext}
                    />
                  </div>
                </div>
              ) : null}

              {showControls ? (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {items.map((item, index) => {
                    const isActive = index === activeIndex;

                    return (
                      <button
                        key={item.video?.src || item.title || index}
                        type="button"
                        data-slot="benefits-review-indicator"
                        aria-label={`Show review ${index + 1}`}
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-200',
                          isActive
                            ? inverse
                              ? 'bg-background w-8'
                              : 'bg-foreground w-8'
                            : inverse
                              ? 'bg-background/28 hover:bg-background/40 w-3'
                              : 'bg-foreground/18 hover:bg-foreground/30 w-3'
                        )}
                        onClick={() => setActiveIndex(index)}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
}
