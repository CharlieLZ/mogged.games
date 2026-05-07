'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  Maximize2Icon,
  XIcon,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  getGptImageComparisonCopy,
  getGptImageComparisonItems,
  type GptImageComparisonImage,
} from '@/shared/lib/gpt-image-comparison';
import {
  publicPageMedia,
  publicPageTypography,
} from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';

const AUTO_ADVANCE_MS = 3000;
const GPT_PREVIEW_DIALOG_CONTENT_CLASS =
  'w-auto max-w-none gap-0 border-none bg-transparent p-0 shadow-none sm:max-w-none';
const GPT_PREVIEW_DIALOG_FRAME_CLASS =
  'border-border/70 bg-background relative overflow-hidden rounded-xl border shadow-2xl';
const GPT_PREVIEW_DIALOG_CLOSE_CLASS =
  'bg-background/92 border-border/70 text-foreground hover:bg-background absolute top-3 right-3 z-20 rounded-full border shadow-sm backdrop-blur rtl:right-auto rtl:left-3';
const GPT_PREVIEW_DIALOG_CONTENT_STYLE = {
  maxWidth: 'none',
  width: 'fit-content',
} as const;
const GPT_PREVIEW_DIALOG_FRAME_STYLE = {
  height: '88vw',
  maxHeight: '44rem',
  maxWidth: '44rem',
  width: '88vw',
} as const;
const GPT_COMPARISON_IMAGE_DIMENSION = 1600;

type CopyState = 'idle' | 'copied' | 'failed';

function r2DirectImageLoader({ src }: { src: string }) {
  return src;
}

function copyTextWithTextarea(text: string) {
  if (typeof document === 'undefined') {
    throw new Error('document is unavailable');
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.inset = '0 auto auto 0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand('copy');

    if (!copied) {
      throw new Error('document.execCommand("copy") returned false');
    }
  } finally {
    textarea.remove();
  }
}

async function writePromptToClipboard(prompt: string, itemId: string) {
  if (!prompt.trim()) {
    throw new Error(
      `[landing/gpt-image-comparison] empty prompt for ${itemId}`
    );
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(prompt);
      return;
    }

    copyTextWithTextarea(prompt);
  } catch (error) {
    console.error('[landing/gpt-image-comparison] copy prompt failed', {
      error,
      itemId,
    });
    throw error;
  }
}

function shouldSkipAutoAdvance() {
  if (typeof window === 'undefined') {
    return true;
  }

  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
}

function ComparisonImagePanel({
  image,
  isPrimary,
  onOpen,
  openPreviewLabel,
}: {
  image: GptImageComparisonImage;
  isPrimary?: boolean;
  onOpen: () => void;
  openPreviewLabel: string;
}) {
  return (
    <button
      type="button"
      data-slot="gpt-image-comparison-image-button"
      onClick={onOpen}
      aria-label={`${openPreviewLabel}: ${image.alt}`}
      className="group/image bg-muted/30 focus-visible:ring-ring focus-visible:ring-offset-background relative block aspect-square w-full min-w-0 cursor-zoom-in overflow-hidden text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none rtl:text-right"
    >
      <span
        className={cn(
          'absolute top-3 left-3 z-10 rounded-md px-3 py-1 text-sm font-semibold shadow-sm md:top-4 md:left-4 rtl:right-3 rtl:left-auto md:rtl:right-4',
          isPrimary
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        {image.label}
      </span>
      <span className="bg-background/88 text-foreground border-border/70 absolute right-3 bottom-3 z-10 inline-flex size-9 items-center justify-center rounded-full border shadow-sm backdrop-blur rtl:right-auto rtl:left-3">
        <Maximize2Icon className="size-4" aria-hidden="true" />
      </span>
      <Image
        data-slot="gpt-image-comparison-image"
        src={image.src}
        alt={image.alt}
        width={GPT_COMPARISON_IMAGE_DIMENSION}
        height={GPT_COMPARISON_IMAGE_DIMENSION}
        loader={r2DirectImageLoader}
        loading={isPrimary ? 'eager' : 'lazy'}
        fetchPriority={isPrimary ? 'high' : undefined}
        sizes="(max-width: 1024px) 92vw, 480px"
        unoptimized
        className="block w-full h-auto object-contain transition duration-500 group-hover/image:scale-[1.015]"
      />
    </button>
  );
}

export function GptImageComparisonShowcase({
  className,
  locale,
}: {
  className?: string;
  locale?: string;
}) {
  const copy = useMemo(() => getGptImageComparisonCopy(locale), [locale]);
  const items = useMemo(() => getGptImageComparisonItems(locale), [locale]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [isCopyPending, setIsCopyPending] = useState(false);
  const [previewImage, setPreviewImage] =
    useState<GptImageComparisonImage | null>(null);
  const activeItem = items[activeIndex] ?? items[0];
  const canRotate = items.length > 1;

  const showPrevious = useCallback(() => {
    setCopyState('idle');
    setActiveIndex((current) =>
      current === 0 ? items.length - 1 : current - 1
    );
  }, [items.length]);

  const showNext = useCallback(() => {
    setCopyState('idle');
    setActiveIndex((current) => (current + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (!canRotate || isPaused || previewImage || shouldSkipAutoAdvance()) {
      return;
    }

    const interval = window.setInterval(showNext, AUTO_ADVANCE_MS);

    return () => window.clearInterval(interval);
  }, [canRotate, isPaused, previewImage, showNext]);

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }

    const timeout = window.setTimeout(() => setCopyState('idle'), 2200);

    return () => window.clearTimeout(timeout);
  }, [copyState]);

  if (!activeItem) {
    return null;
  }

  const handleCopyPrompt = async () => {
    if (isCopyPending) {
      return;
    }

    setIsCopyPending(true);
    try {
      await writePromptToClipboard(activeItem.prompt, activeItem.id);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    } finally {
      setIsCopyPending(false);
    }
  };

  return (
    <Dialog
      open={previewImage !== null}
      onOpenChange={(open) => {
        if (!open) {
          setPreviewImage(null);
        }
      }}
    >
      <section
        data-slot="gpt-image-comparison-showcase"
        className={cn('bg-background py-10 md:py-16', className)}
      >
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <h2
              className={cn(
                'text-foreground text-balance',
                publicPageTypography.sectionHeading
              )}
            >
              {copy.title}
            </h2>
            <p
              className={cn(
                'text-muted-foreground mx-auto max-w-3xl',
                publicPageTypography.sectionDescription
              )}
            >
              {copy.description}
            </p>
          </div>

          <div
            className={cn(
              'group border-border/70 bg-card/80 relative mx-auto mt-8 rounded-lg border p-3 shadow-lg md:mt-10 md:p-5',
              publicPageMedia.gptComparisonPanel
            )}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsPaused(false);
              }
            }}
          >
            <div
              data-slot="gpt-image-comparison-slide"
              data-active-id={activeItem.id}
              className="border-border/70 bg-background overflow-hidden rounded-md border"
            >
              <div className="divide-border/70 grid min-h-0 grid-cols-1 divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <div className="min-w-0">
                  <ComparisonImagePanel
                    image={activeItem.gptImage}
                    isPrimary
                    onOpen={() => setPreviewImage(activeItem.gptImage)}
                    openPreviewLabel={copy.openPreview}
                  />
                </div>
                <div className="min-w-0">
                  <ComparisonImagePanel
                    image={activeItem.nanoBanana}
                    onOpen={() => setPreviewImage(activeItem.nanoBanana)}
                    openPreviewLabel={copy.openPreview}
                  />
                </div>
              </div>
            </div>

            {canRotate ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  data-slot="gpt-image-comparison-previous"
                  aria-label={copy.previous}
                  onClick={showPrevious}
                  className="absolute top-[34%] left-1 z-20 rounded-full opacity-100 shadow-md transition-opacity md:left-2 lg:-left-4 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 rtl:right-1 rtl:left-auto md:rtl:right-2 lg:rtl:-right-4"
                >
                  <ChevronLeftIcon className="size-5 rtl:rotate-180" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  data-slot="gpt-image-comparison-next"
                  aria-label={copy.next}
                  onClick={showNext}
                  className="absolute top-[34%] right-1 z-20 rounded-full opacity-100 shadow-md transition-opacity md:right-2 lg:-right-4 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 rtl:right-auto rtl:left-1 md:rtl:left-2 lg:rtl:-left-4"
                >
                  <ChevronRightIcon className="size-5 rtl:rotate-180" />
                </Button>
              </>
            ) : null}

            <div className="border-border/70 bg-background mt-3 rounded-md border p-4 md:mt-4 md:p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-primary text-sm font-semibold">
                  {copy.promptLabel}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-slot="gpt-image-comparison-copy"
                  onClick={handleCopyPrompt}
                  disabled={isCopyPending}
                >
                  {copyState === 'copied' ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                  <span>
                    {copyState === 'copied'
                      ? copy.copied
                      : copyState === 'failed'
                        ? copy.copyFailed
                        : copy.copyPrompt}
                  </span>
                </Button>
              </div>
              <p
                className={cn(
                  'text-foreground/85',
                  publicPageTypography.cardDescription
                )}
              >
                {activeItem.prompt}
              </p>
            </div>

            {canRotate ? (
              <div
                data-slot="gpt-image-comparison-indicators"
                className="border-border bg-card mx-auto mt-4 flex w-fit items-center justify-center gap-2 rounded-full border px-3 py-2 shadow-sm"
              >
                {items.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    data-slot="gpt-image-comparison-indicator"
                    aria-label={`${copy.imagePreview} ${index + 1}`}
                    aria-current={index === activeIndex}
                    onClick={() => {
                      setCopyState('idle');
                      setActiveIndex(index);
                    }}
                    className={cn(
                      'focus-visible:ring-ring focus-visible:ring-offset-background h-2.5 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                      index === activeIndex
                        ? 'bg-primary w-8'
                        : 'bg-muted-foreground/45 hover:bg-muted-foreground/70 w-2.5'
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {previewImage ? (
        <DialogContent
          showCloseButton={false}
          className={GPT_PREVIEW_DIALOG_CONTENT_CLASS}
          style={GPT_PREVIEW_DIALOG_CONTENT_STYLE}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{previewImage.alt}</DialogTitle>
          <DialogDescription className="sr-only">
            {copy.imagePreview}
          </DialogDescription>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              data-slot="gpt-image-comparison-dialog-close"
              aria-label={copy.closePreview}
              className={GPT_PREVIEW_DIALOG_CLOSE_CLASS}
            >
              <XIcon className="size-4" aria-hidden="true" />
            </Button>
          </DialogClose>
          <div
            data-slot="gpt-image-comparison-preview-frame"
            className={GPT_PREVIEW_DIALOG_FRAME_CLASS}
            style={GPT_PREVIEW_DIALOG_FRAME_STYLE}
          >
            <Image
              src={previewImage.src}
              alt={previewImage.alt}
              width={GPT_COMPARISON_IMAGE_DIMENSION}
              height={GPT_COMPARISON_IMAGE_DIMENSION}
              loader={r2DirectImageLoader}
              sizes="(max-width: 1024px) 88vw, 44rem"
              unoptimized
              className="block w-full h-auto object-contain"
            />
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
