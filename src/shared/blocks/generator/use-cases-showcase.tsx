'use client';

/* eslint-disable @next/next/no-img-element -- Use case assets are pre-hosted R2 files; the enlarged lightbox uses a plain image to avoid fill-layout blank states. */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { Link } from '@/core/i18n/navigation';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/utils';

import { USE_CASES, type UseCase } from './use-cases';

export type { UseCase };

const AUTO_ADVANCE_MS = 5200;
const AUTO_COMPARE_MS = 90;
const DEFAULT_TRY_IT_NOW_HREF = '#ai-image-generator-workspace';
const SHOWCASE_IMAGE_ASPECT_RATIO = '6 / 5';
const DETAILS_COMPARISON_ASPECT_RATIO = SHOWCASE_IMAGE_ASPECT_RATIO;
const PREVIEW_DIALOG_MAX_WIDTH = '68rem';
const PREVIEW_STAGE_MAX_WIDTH = '64rem';
const PREVIEW_STAGE_MAX_HEIGHT = '40rem';
const DETAILS_DIALOG_WIDTH = 'calc(100vw - 2rem)';
const DETAILS_DIALOG_MAX_WIDTH = '88rem';
const DETAILS_DIALOG_MAX_HEIGHT = 'calc(100vh - 2rem)';
const PREVIEW_CONTROL_CLASS =
  'absolute top-1/2 z-20 inline-flex -translate-y-1/2 rounded-full bg-background/88 text-foreground shadow-lg transition-[opacity,transform,background-color] duration-200 hover:scale-105 hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:pointer-events-none md:opacity-0 md:group-hover/preview:pointer-events-auto md:group-hover/preview:opacity-100 md:group-focus-within/preview:pointer-events-auto md:group-focus-within/preview:opacity-100';

type UseCasesShowcaseProps = {
  items?: readonly UseCase[] | null;
  className?: string;
  tryItNowHref?: string;
};

type PreviewImageState = {
  item: UseCase;
  side: 'before' | 'after';
};

function getPreviewImageSrc(preview: PreviewImageState | null) {
  if (!preview) {
    return null;
  }

  if (preview.side === 'before') {
    return preview.item.previewBeforeImage ?? preview.item.beforeImage;
  }

  return preview.item.previewAfterImage ?? preview.item.afterImage;
}

function hasRenderableUseCase(
  item: UseCase | null | undefined
): item is UseCase {
  return Boolean(
    item?.id?.trim() &&
    item.title?.trim() &&
    item.beforeImage?.trim() &&
    item.afterImage?.trim() &&
    item.prompt?.trim()
  );
}

function getUseCaseSeoCaption(item: UseCase) {
  return `mogged before-and-after example for ${item.title}. Open the prompt details to review the full image edit workflow.`;
}

async function copyText(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is unavailable.');
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', 'true');
  input.style.position = 'absolute';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(input);

  if (!copied) {
    throw new Error('Copy command failed.');
  }
}

function UseCaseImage({
  src,
  alt,
  priority,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div className="bg-muted text-muted-foreground flex h-full min-h-64 w-full items-center justify-center rounded-md p-4 text-center text-sm">
        Image preview unavailable
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 1024px) 42vw, 92vw"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      unoptimized
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}

function ImagePanel({
  item,
  side,
  priority,
  onOpenPreview,
}: {
  item: UseCase;
  side: 'before' | 'after';
  priority?: boolean;
  onOpenPreview: (state: PreviewImageState) => void;
}) {
  const isBefore = side === 'before';
  const label = isBefore ? 'Before' : 'After';
  const image = isBefore ? item.beforeImage : item.afterImage;
  const slot = isBefore ? 'use-case-before-image' : 'use-case-after-image';

  return (
    <button
      type="button"
      data-slot={slot}
      onClick={() => onOpenPreview({ item, side })}
      style={{ aspectRatio: SHOWCASE_IMAGE_ASPECT_RATIO }}
      className="group focus-visible:ring-ring/50 bg-muted relative w-full overflow-hidden rounded-md text-left shadow-sm focus-visible:ring-3 focus-visible:outline-none"
      aria-label={`Open ${label.toLowerCase()} image for ${item.title}`}
    >
      <UseCaseImage
        src={image}
        alt={`${item.title} ${label.toLowerCase()} example`}
        priority={priority}
        className="transition-transform duration-500 group-hover:scale-[1.025]"
      />
      <span
        className={cn(
          'absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold shadow-sm',
          isBefore
            ? 'bg-foreground/78 text-background'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {label}
      </span>
    </button>
  );
}

function ComparisonSlider({ item }: { item: UseCase }) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const directionRef = useRef(1);
  const [divider, setDivider] = useState(50);

  useEffect(() => {
    setDivider(50);
    directionRef.current = 1;
  }, [item.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDivider((current) => {
        let next = current + directionRef.current * 1.35;

        if (next >= 78) {
          next = 78;
          directionRef.current = -1;
        }

        if (next <= 22) {
          next = 22;
          directionRef.current = 1;
        }

        return next;
      });
    }, AUTO_COMPARE_MS);

    return () => window.clearInterval(timer);
  }, []);

  const updateDividerFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = frameRef.current?.getBoundingClientRect();

      if (!rect || rect.width <= 0) {
        return;
      }

      const next = ((event.clientX - rect.left) / rect.width) * 100;
      setDivider(Math.min(Math.max(next, 8), 92));
    },
    []
  );

  return (
    <div
      ref={frameRef}
      data-slot="use-case-comparison-slider"
      style={{ aspectRatio: DETAILS_COMPARISON_ASPECT_RATIO }}
      role="slider"
      tabIndex={0}
      aria-label={`${item.title} before and after comparison`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(divider)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        updateDividerFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons === 1) {
          updateDividerFromPointer(event);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          setDivider((current) => Math.max(current - 5, 8));
        }

        if (event.key === 'ArrowRight') {
          event.preventDefault();
          setDivider((current) => Math.min(current + 5, 92));
        }
      }}
      className="focus-visible:ring-ring/50 bg-muted relative min-h-[16rem] overflow-hidden focus-visible:ring-3 focus-visible:outline-none sm:min-h-[18rem]"
    >
      <UseCaseImage
        src={item.afterImage}
        alt={`${item.title} after comparison`}
        priority
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - divider}% 0 0)` }}
      >
        <UseCaseImage
          src={item.beforeImage}
          alt={`${item.title} before comparison`}
          priority
        />
      </div>
      <div
        className="bg-background absolute inset-y-0 z-10 w-0.5 shadow-sm"
        style={{ left: `${divider}%` }}
      />
      <div
        className="border-background bg-primary text-primary-foreground absolute top-1/2 z-20 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-sm"
        style={{ left: `${divider}%` }}
        aria-hidden="true"
      >
        <ChevronLeft className="size-4" />
        <ChevronRight className="size-4" />
      </div>
      <span className="bg-foreground/78 text-background absolute top-4 left-4 z-10 rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
        Before
      </span>
      <span className="bg-primary text-primary-foreground absolute top-4 right-4 z-10 rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
        After
      </span>
    </div>
  );
}

function ImagePreviewDialog({
  preview,
  onOpenChange,
  onPreviewChange,
}: {
  preview: PreviewImageState | null;
  onOpenChange: (open: boolean) => void;
  onPreviewChange: (preview: PreviewImageState) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = getPreviewImageSrc(preview);
  const label = preview?.side === 'before' ? 'Before' : 'After';
  const switchPreviewSide = useCallback(() => {
    if (!preview) {
      return;
    }

    onPreviewChange({
      item: preview.item,
      side: preview.side === 'before' ? 'after' : 'before',
    });
  }, [onPreviewChange, preview]);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  return (
    <Dialog open={Boolean(preview)} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="use-case-image-dialog"
        showCloseButton={false}
        style={{
          maxWidth: PREVIEW_DIALOG_MAX_WIDTH,
        }}
        className="bg-foreground text-background top-4 bottom-4 max-h-[calc(100dvh-2rem)] w-fit translate-y-0 overflow-hidden border-0 p-0 shadow-xl"
      >
        <DialogTitle className="sr-only">
          {preview
            ? `${preview.item.title} ${label} image preview`
            : 'Image preview'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Enlarged before or after use case image preview.
        </DialogDescription>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-12 items-center justify-between px-4 text-sm">
            <span className="font-medium">
              {preview ? `${label} / 2` : null}
            </span>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-slot="use-case-image-dialog-close"
                className="text-background hover:bg-background/12 hover:text-background"
                aria-label="Close image preview"
              >
                <X className="size-5" />
              </Button>
            </DialogClose>
          </div>

          <div
            className="group/preview relative flex min-h-0 flex-1 items-center justify-center px-3 pb-3 sm:px-4 sm:pb-4"
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                switchPreviewSide();
              }
            }}
          >
            {preview && image ? (
              <>
                <button
                  type="button"
                  style={{
                    maxWidth: PREVIEW_STAGE_MAX_WIDTH,
                    maxHeight: PREVIEW_STAGE_MAX_HEIGHT,
                  }}
                  className="focus-visible:ring-ring/50 bg-background/6 relative mx-auto flex h-auto max-h-full w-auto max-w-full cursor-zoom-out items-center justify-center overflow-hidden rounded-xl p-3 focus-visible:ring-3 focus-visible:outline-none sm:p-4"
                  onClick={() => onOpenChange(false)}
                  aria-label={`Close ${label.toLowerCase()} image preview`}
                >
                  {imageFailed ? (
                    <span className="text-background/80 flex h-full w-full items-center justify-center p-6 text-center text-sm">
                      Image preview unavailable
                    </span>
                  ) : (
                    <img
                      data-slot="use-case-image-preview-image"
                      src={image}
                      alt={`${preview.item.title} ${label.toLowerCase()} preview`}
                      loading="eager"
                      decoding="async"
                      style={{
                        maxWidth: PREVIEW_STAGE_MAX_WIDTH,
                        maxHeight: PREVIEW_STAGE_MAX_HEIGHT,
                      }}
                      onError={() => setImageFailed(true)}
                      className="block h-auto max-h-[calc(100dvh-8rem)] w-auto max-w-[calc(100vw-3rem)] object-contain"
                    />
                  )}
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-slot="use-case-image-preview-prev"
                  aria-label="Show previous preview image"
                  onClick={switchPreviewSide}
                  className={cn(PREVIEW_CONTROL_CLASS, 'left-4 md:left-6')}
                >
                  <ChevronLeft className="size-6" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-slot="use-case-image-preview-next"
                  aria-label="Show next preview image"
                  onClick={switchPreviewSide}
                  className={cn(PREVIEW_CONTROL_CLASS, 'right-4 md:right-6')}
                >
                  <ChevronRight className="size-6" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UseCaseDetailsDialog({
  item,
  open,
  onOpenChange,
  onShare,
  tryItNowHref,
}: {
  item: UseCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (item: UseCase) => void;
  tryItNowHref: string;
}) {
  if (!item) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="use-case-details-dialog"
        style={{
          maxHeight: DETAILS_DIALOG_MAX_HEIGHT,
          maxWidth: DETAILS_DIALOG_MAX_WIDTH,
          width: DETAILS_DIALOG_WIDTH,
        }}
        className="gap-0 overflow-y-auto p-0"
      >
        <div
          data-slot="use-case-details-layout"
          className="grid min-h-0 lg:grid-cols-2"
        >
          <div data-slot="use-case-details-media" className="min-h-0">
            <ComparisonSlider item={item} />
          </div>

          <div
            data-slot="use-case-details-copy"
            style={{ maxHeight: DETAILS_DIALOG_MAX_HEIGHT }}
            className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5 md:p-6"
          >
            <DialogHeader className="text-left">
              <DialogTitle className="pr-8 text-2xl leading-tight md:text-3xl">
                {item.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge variant="secondary" className="rounded-full">
                    Transform
                  </Badge>
                  {item.recommended ? (
                    <Badge className="rounded-full">
                      <Sparkles className="size-3.5" />
                      Pro Recommended
                    </Badge>
                  ) : null}
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Prompt</p>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => {
                    void copyText(item.prompt).catch((error) => {
                      console.warn('[use-cases] copy failed', {
                        step: 'copy_prompt',
                        itemId: item.id,
                        error,
                      });
                    });
                  }}
                  aria-label={`Copy prompt for ${item.title}`}
                  title="Copy prompt"
                >
                  <Copy className="size-4" />
                </Button>
              </div>

              <div className="border-border/60 bg-muted/35 max-h-[min(40dvh,24rem)] overflow-y-auto rounded-lg border p-4">
                <pre className="text-foreground/90 p-0 font-sans text-sm leading-6 break-words whitespace-pre-wrap">
                  {item.prompt}
                </pre>
              </div>
            </div>

            <div className="border-border/60 mt-auto flex flex-wrap gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                data-slot="use-case-share"
                className="flex-1 sm:flex-none"
                onClick={() => onShare(item)}
              >
                <Share2 className="size-4" />
                Share
              </Button>
              <Button
                asChild
                data-slot="use-case-try-it-now"
                className="flex-1 sm:flex-none"
                onClick={() => onOpenChange(false)}
              >
                {tryItNowHref.startsWith('/') ? (
                  <Link href={tryItNowHref}>
                    Try it now
                    <ExternalLink className="size-4" />
                  </Link>
                ) : (
                  <a href={tryItNowHref}>
                    Try it now
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UseCasesShowcase({
  items = USE_CASES,
  className,
  tryItNowHref = DEFAULT_TRY_IT_NOW_HREF,
}: UseCasesShowcaseProps) {
  const safeItems = useMemo(
    () => (items ?? []).filter(hasRenderableUseCase),
    [items]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [preview, setPreview] = useState<PreviewImageState | null>(null);
  const [detailsItem, setDetailsItem] = useState<UseCase | null>(null);
  const dotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previousActiveIndexRef = useRef(activeIndex);
  const shouldScrollActiveDotRef = useRef(false);

  const setActiveIndexFromUser = useCallback(
    (nextIndex: number | ((current: number) => number)) => {
      shouldScrollActiveDotRef.current = true;
      setActiveIndex(nextIndex);
    },
    []
  );

  useEffect(() => {
    if (activeIndex >= safeItems.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, safeItems.length]);

  useEffect(() => {
    dotRefs.current.length = safeItems.length;
  }, [safeItems.length]);

  useEffect(() => {
    if (previousActiveIndexRef.current === activeIndex) {
      return;
    }

    previousActiveIndexRef.current = activeIndex;

    if (!shouldScrollActiveDotRef.current) {
      return;
    }

    shouldScrollActiveDotRef.current = false;
    dotRefs.current[activeIndex]?.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeIndex]);

  useEffect(() => {
    if (safeItems.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeItems.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [safeItems.length]);

  if (safeItems.length === 0) {
    return null;
  }

  const activeItem = safeItems[activeIndex] ?? safeItems[0];
  const showNavigationControls = safeItems.length > 1;
  const handleShare = (item: UseCase) => {
    const shareUrl =
      typeof window !== 'undefined' && window.location?.href
        ? window.location.href
        : undefined;

    if (typeof navigator !== 'undefined' && navigator.share) {
      void navigator
        .share({
          title: item.title,
          text: item.prompt,
          ...(shareUrl ? { url: shareUrl } : {}),
        })
        .catch((error) => {
          console.warn('[use-cases] share failed', {
            step: 'share_prompt',
            itemId: item.id,
            error,
          });
        });
      return;
    }

    void copyText(item.prompt).catch((error) => {
      console.warn('[use-cases] copy failed', {
        step: 'share_fallback_copy_prompt',
        itemId: item.id,
        error,
      });
    });
  };

  return (
    <section
      data-slot="image-generator-use-cases"
      className={cn('py-10 md:py-14', className)}
    >
      <div className="container">
        <div
          data-slot="use-case-card"
          className="border-border/60 bg-card text-card-foreground mx-auto max-w-7xl rounded-2xl border p-4 shadow-sm md:p-8"
        >
          <h2
            data-slot="use-case-heading"
            className="mb-6 text-center text-xl leading-tight font-semibold text-balance md:text-2xl"
          >
            What mogged Can Edit Fast
          </h2>

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <ImagePanel
              item={activeItem}
              side="before"
              priority
              onOpenPreview={setPreview}
            />
            <ImagePanel
              item={activeItem}
              side="after"
              priority
              onOpenPreview={setPreview}
            />
          </div>

          <div className="mx-auto mt-6 max-w-5xl space-y-5">
            <div
              data-slot="use-case-dot-navigation"
              className="flex flex-nowrap justify-start gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-center md:overflow-visible"
              aria-label="Use case navigation"
            >
              {safeItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  data-slot="use-case-dot"
                  ref={(node) => {
                    dotRefs.current[index] = node;
                  }}
                  onClick={() => setActiveIndexFromUser(index)}
                  className={cn(
                    'focus-visible:ring-ring/50 h-2.5 rounded-full transition-[width,background-color] focus-visible:ring-3 focus-visible:outline-none',
                    index === activeIndex
                      ? 'bg-primary w-9'
                      : 'bg-muted-foreground/45 hover:bg-muted-foreground/70 w-2.5'
                  )}
                  aria-label={`Show ${item.title}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                />
              ))}
            </div>

            <p
              data-slot="use-case-position"
              className="text-muted-foreground text-center text-xs font-medium tracking-[0.18em]"
            >
              {activeIndex + 1} / {safeItems.length}
            </p>

            <div className="grid items-start gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto]">
              {showNavigationControls ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  data-slot="use-case-prev"
                  onClick={() =>
                    setActiveIndexFromUser(
                      (current) =>
                        (current - 1 + safeItems.length) % safeItems.length
                    )
                  }
                  aria-label="Previous use case"
                  className="hidden rounded-full md:inline-flex"
                >
                  <ChevronLeft className="size-5" />
                </Button>
              ) : (
                <div className="hidden md:block" aria-hidden="true" />
              )}

              <div className="min-w-0 text-center">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <h3
                    data-slot="use-case-title"
                    className="text-xl leading-tight font-semibold md:text-2xl"
                  >
                    {activeItem.title}
                  </h3>
                  {activeItem.recommended ? (
                    <Badge className="rounded-full">
                      <Sparkles className="size-3.5" />
                      Pro Recommended
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    data-slot="use-case-details-open"
                    onClick={() => setDetailsItem(activeItem)}
                    aria-label={`Open prompt details for ${activeItem.title}`}
                    title="View prompt details"
                  >
                    <Eye className="size-4" />
                  </Button>
                </div>

                <div className="mx-auto mt-3 flex max-w-4xl items-start justify-center gap-2">
                  <p
                    data-slot="use-case-prompt-preview"
                    className="text-muted-foreground line-clamp-2 text-sm leading-6 md:text-base"
                  >
                    {getUseCaseSeoCaption(activeItem)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      void copyText(activeItem.prompt).catch((error) => {
                        console.warn('[use-cases] copy failed', {
                          step: 'copy_prompt',
                          itemId: activeItem.id,
                          error,
                        });
                      });
                    }}
                    aria-label={`Copy prompt for ${activeItem.title}`}
                    title="Copy prompt"
                    className="mt-0.5 hidden md:inline-flex"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>

              {showNavigationControls ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  data-slot="use-case-next"
                  onClick={() =>
                    setActiveIndexFromUser(
                      (current) => (current + 1) % safeItems.length
                    )
                  }
                  aria-label="Next use case"
                  className="hidden rounded-full md:inline-flex"
                >
                  <ChevronRight className="size-5" />
                </Button>
              ) : (
                <div className="hidden md:block" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>
      </div>

      <ImagePreviewDialog
        preview={preview}
        onPreviewChange={setPreview}
        onOpenChange={(open) => {
          if (!open) {
            setPreview(null);
          }
        }}
      />
      <UseCaseDetailsDialog
        item={detailsItem}
        open={Boolean(detailsItem)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsItem(null);
          }
        }}
        onShare={handleShare}
        tryItNowHref={tryItNowHref}
      />
    </section>
  );
}
