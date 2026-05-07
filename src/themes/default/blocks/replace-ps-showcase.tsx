'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  ImageOffIcon,
  Maximize2Icon,
  PauseIcon,
  PlayIcon,
  SparklesIcon,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  publicPageMedia,
  publicPageTypography,
} from '@/shared/lib/public-page-sizing';
import {
  getReplacePsShowcaseCategories,
  getReplacePsShowcaseCopy,
  type ReplacePsShowcaseImage,
} from '@/shared/lib/replace-ps-showcase';
import { cn } from '@/shared/lib/utils';

const AUTO_ADVANCE_MS = 5200;

type CopyState = 'idle' | 'copied' | 'failed';

type ActivePosition = {
  categoryIndex: number;
  slideIndex: number;
};

type PreviewMode = 'after' | 'before';

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

async function writePromptToClipboard(prompt: string, slideId: string) {
  if (!prompt.trim()) {
    throw new Error(
      `[landing/replace-ps-showcase] empty prompt for ${slideId}`
    );
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(prompt);
      return;
    }

    copyTextWithTextarea(prompt);
  } catch (error) {
    console.error('[landing/replace-ps-showcase] copy prompt failed', {
      error,
      slideId,
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

function getMaxSeriesLength(
  categories: ReturnType<typeof getReplacePsShowcaseCategories>
) {
  return Math.max(
    1,
    ...categories.map((category) => Math.max(1, category.slides.length))
  );
}

function normalizeSlideIndex(slideIndex: number, slideCount: number) {
  if (slideCount < 1) {
    return 0;
  }

  return ((slideIndex % slideCount) + slideCount) % slideCount;
}

function ShowcaseImageButton({
  badge,
  image,
  isBefore,
  loadImmediately = false,
  onOpen,
  openPreviewLabel,
  unavailableLabel,
}: {
  badge: string;
  image: ReplacePsShowcaseImage;
  isBefore?: boolean;
  loadImmediately?: boolean;
  onOpen: () => void;
  openPreviewLabel: string;
  unavailableLabel: string;
}) {
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    setHasLoadError(false);
  }, [image.src]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${openPreviewLabel}: ${image.alt}`}
      style={{ aspectRatio: '4 / 3' }}
      className={cn(
        'group/image border-border/70 bg-card focus-visible:ring-ring focus-visible:ring-offset-background block w-full min-w-0 overflow-hidden rounded-lg border text-left shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none rtl:text-right',
        publicPageMedia.comparisonFrame
      )}
    >
      {isBefore ? (
        <span className="bg-secondary text-secondary-foreground absolute top-3 left-3 z-20 inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold shadow-sm md:top-4 md:left-4 rtl:right-3 rtl:left-auto md:rtl:right-4">
          {badge}
        </span>
      ) : (
        <span className="bg-primary text-primary-foreground absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-semibold shadow-sm md:top-4 md:right-4 rtl:right-auto rtl:left-3 md:rtl:left-4">
          <SparklesIcon className="size-4" aria-hidden="true" />
          {badge}
        </span>
      )}

      <span className="bg-background/80 text-foreground absolute right-3 bottom-3 z-20 inline-flex size-9 items-center justify-center rounded-md opacity-0 shadow-sm transition-opacity group-hover/image:opacity-100 group-focus-visible/image:opacity-100 md:right-4 md:bottom-4 rtl:right-auto rtl:left-3 md:rtl:left-4">
        <Maximize2Icon className="size-4" aria-hidden="true" />
      </span>

      <Image
        data-slot="replace-ps-image"
        src={image.src}
        alt={image.alt}
        fill
        loader={r2DirectImageLoader}
        loading={loadImmediately ? 'eager' : 'lazy'}
        sizes="(max-width: 1024px) 92vw, 560px"
        unoptimized
        onError={() => {
          setHasLoadError(true);
          console.error('[landing/replace-ps-showcase] image load failed', {
            alt: image.alt,
            src: image.src,
          });
        }}
        className={cn(
          'object-cover transition-transform duration-500 group-hover/image:scale-[1.015]',
          hasLoadError && 'opacity-0'
        )}
      />

      {hasLoadError ? (
        <span className="bg-muted text-muted-foreground absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm font-medium">
          <ImageOffIcon className="size-6" aria-hidden="true" />
          {unavailableLabel}
        </span>
      ) : null}
    </button>
  );
}

export function ReplacePsShowcase({
  className,
  locale,
}: {
  className?: string;
  locale?: string;
}) {
  const copy = useMemo(() => getReplacePsShowcaseCopy(locale), [locale]);
  const categories = useMemo(
    () => getReplacePsShowcaseCategories(locale),
    [locale]
  );
  const [activePosition, setActivePosition] = useState<ActivePosition>({
    categoryIndex: 0,
    slideIndex: 0,
  });
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [isCopyPending, setIsCopyPending] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null);

  const activeCategory =
    categories[activePosition.categoryIndex] ?? categories[0];
  const activeSlideIndex = normalizeSlideIndex(
    activePosition.slideIndex,
    activeCategory?.slides.length ?? 0
  );
  const activeSlide =
    activeCategory?.slides[activeSlideIndex] ?? activeCategory?.slides[0];
  const maxSeriesLength = getMaxSeriesLength(categories);
  const canAutoAdvance =
    categories.length > 1 ||
    categories.some((category) => category.slides.length > 1);
  const canNavigateActiveSlides = (activeCategory?.slides.length ?? 0) > 1;
  const previewImage =
    previewMode === 'before'
      ? activeCategory?.beforeImage
      : previewMode === 'after'
        ? activeSlide?.afterImage
        : null;

  const showNextCategory = useCallback(() => {
    setCopyState('idle');
    setActivePosition((current) => {
      if (categories.length < 1) {
        return { categoryIndex: 0, slideIndex: 0 };
      }

      const currentCategoryIndex = Math.min(
        Math.max(current.categoryIndex, 0),
        categories.length - 1
      );
      const nextCategoryIndex = (currentCategoryIndex + 1) % categories.length;
      const nextSlideIndex =
        nextCategoryIndex === 0
          ? (current.slideIndex + 1) % maxSeriesLength
          : current.slideIndex;

      return {
        categoryIndex: nextCategoryIndex,
        slideIndex: nextSlideIndex,
      };
    });
  }, [categories, maxSeriesLength]);

  const showSlide = useCallback(
    (direction: 1 | -1) => {
      setCopyState('idle');
      setActivePosition((current) => {
        if (categories.length < 1) {
          return { categoryIndex: 0, slideIndex: 0 };
        }

        const currentCategoryIndex = Math.min(
          Math.max(current.categoryIndex, 0),
          categories.length - 1
        );
        const currentCategory = categories[currentCategoryIndex];
        const slideCount = currentCategory?.slides.length ?? 0;

        if (slideCount < 1) {
          return { categoryIndex: currentCategoryIndex, slideIndex: 0 };
        }

        return {
          categoryIndex: currentCategoryIndex,
          slideIndex: normalizeSlideIndex(
            current.slideIndex + direction,
            slideCount
          ),
        };
      });
    },
    [categories]
  );

  const showNextSlide = useCallback(() => showSlide(1), [showSlide]);
  const showPreviousSlide = useCallback(() => showSlide(-1), [showSlide]);

  useEffect(() => {
    if (
      !canAutoAdvance ||
      isUserPaused ||
      previewMode ||
      shouldSkipAutoAdvance()
    ) {
      return;
    }

    const interval = window.setInterval(showNextCategory, AUTO_ADVANCE_MS);

    return () => window.clearInterval(interval);
  }, [canAutoAdvance, isUserPaused, previewMode, showNextCategory]);

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }

    const timeout = window.setTimeout(() => setCopyState('idle'), 2200);

    return () => window.clearTimeout(timeout);
  }, [copyState]);

  if (!activeCategory || !activeSlide) {
    return null;
  }

  const handleCopyPrompt = async () => {
    if (isCopyPending) {
      return;
    }

    setIsCopyPending(true);
    try {
      await writePromptToClipboard(activeSlide.prompt, activeSlide.id);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    } finally {
      setIsCopyPending(false);
    }
  };
  const handleToggleAutoAdvance = () => {
    setCopyState('idle');
    setIsUserPaused((current) => !current);
  };
  const rotationToggleLabel = isUserPaused
    ? copy.playAutoRotate
    : copy.pauseAutoRotate;

  return (
    <>
      <section
        data-slot="replace-ps-showcase"
        className={cn('bg-background py-10 md:py-16', className)}
      >
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <h2
              className={cn(
                'text-foreground tracking-normal',
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

          <div className="mx-auto mt-8 max-w-5xl md:mt-10">
            <div
              role="tablist"
              aria-label={copy.tabListLabel}
              className="border-border/70 bg-card grid gap-1 rounded-lg border p-1 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
            >
              {categories.map((category, index) => {
                const isActive = index === activePosition.categoryIndex;

                return (
                  <button
                    key={category.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-slot={`replace-ps-tab-${category.id}`}
                    onClick={() => {
                      setCopyState('idle');
                      setActivePosition({
                        categoryIndex: index,
                        slideIndex: 0,
                      });
                    }}
                    className={cn(
                      'focus-visible:ring-ring focus-visible:ring-offset-background min-w-0 rounded-md px-3 py-3 text-sm font-semibold text-wrap transition-[color,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:text-base',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {category.tabLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            data-slot="replace-ps-rotator"
            className={cn(
              'group relative mx-auto mt-8 md:mt-10',
              publicPageMedia.comparisonPanel
            )}
          >
            <div
              data-slot="replace-ps-slide"
              data-active-id={activeSlide.id}
              data-active-category-id={activeCategory.id}
              className="grid gap-5 lg:grid-cols-2 lg:gap-7"
            >
              <ShowcaseImageButton
                badge={copy.beforeLabel}
                image={activeCategory.beforeImage}
                isBefore
                loadImmediately
                onOpen={() => setPreviewMode('before')}
                openPreviewLabel={copy.openPreview}
                unavailableLabel={copy.unavailable}
              />

              <div className="relative min-w-0">
                <ShowcaseImageButton
                  badge={copy.aiBadge}
                  image={activeSlide.afterImage}
                  loadImmediately
                  onOpen={() => setPreviewMode('after')}
                  openPreviewLabel={copy.openPreview}
                  unavailableLabel={copy.unavailable}
                />

                {canNavigateActiveSlides ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      data-slot="replace-ps-previous"
                      aria-label={copy.previous}
                      onClick={showPreviousSlide}
                      className="bg-background/85 absolute top-1/2 left-3 z-30 rounded-full opacity-100 shadow-md transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 rtl:right-3 rtl:left-auto"
                    >
                      <ChevronLeftIcon
                        className="size-5 rtl:rotate-180"
                        aria-hidden="true"
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      data-slot="replace-ps-next"
                      aria-label={copy.next}
                      onClick={showNextSlide}
                      className="bg-background/85 absolute top-1/2 right-3 z-30 rounded-full opacity-100 shadow-md transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 rtl:right-auto rtl:left-3"
                    >
                      <ChevronRightIcon
                        className="size-5 rtl:rotate-180"
                        aria-hidden="true"
                      />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <div
              data-slot="replace-ps-prompt-panel"
              className="border-border/70 bg-card/92 mx-auto mt-4 grid w-full max-w-4xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border p-3 text-left shadow-sm backdrop-blur-sm md:mt-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-3 rtl:text-right"
            >
              <span className="text-primary hidden text-xs font-semibold md:inline">
                {copy.promptLabel}
              </span>
              <p className="text-card-foreground min-w-0 text-sm leading-6 font-semibold break-words md:text-base md:leading-7">
                {activeSlide.prompt}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-slot="replace-ps-copy"
                onClick={handleCopyPrompt}
                disabled={isCopyPending}
                aria-live="polite"
                className="bg-background/80"
              >
                {copyState === 'copied' ? (
                  <CheckIcon className="size-4" aria-hidden="true" />
                ) : (
                  <CopyIcon className="size-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {copyState === 'copied'
                    ? copy.copied
                    : copyState === 'failed'
                      ? copy.copyFailed
                      : copy.copyPrompt}
                </span>
              </Button>
            </div>

            {canAutoAdvance || canNavigateActiveSlides ? (
              <div className="mt-4 flex items-center justify-center gap-2">
                {canAutoAdvance ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    data-slot="replace-ps-rotation-toggle"
                    aria-label={rotationToggleLabel}
                    onClick={handleToggleAutoAdvance}
                    className="bg-background/85 size-8 rounded-full shadow-sm"
                  >
                    {isUserPaused ? (
                      <PlayIcon className="size-4" aria-hidden="true" />
                    ) : (
                      <PauseIcon className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                ) : null}

                {canNavigateActiveSlides ? (
                  <div className="flex items-center justify-center gap-2">
                    {activeCategory.slides.map((slide, index) => (
                      <button
                        type="button"
                        key={slide.id}
                        aria-label={`${copy.imagePreview} ${index + 1}`}
                        aria-current={index === activeSlideIndex}
                        onClick={() => {
                          setCopyState('idle');
                          setActivePosition((current) => ({
                            categoryIndex: current.categoryIndex,
                            slideIndex: index,
                          }));
                        }}
                        className={cn(
                          'focus-visible:ring-ring focus-visible:ring-offset-background h-2.5 rounded-full transition-[width,background-color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                          index === activeSlideIndex
                            ? 'bg-primary w-8'
                            : 'bg-muted-foreground/35 hover:bg-muted-foreground/60 w-2.5'
                        )}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <Dialog
        open={previewMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewMode(null);
          }
        }}
      >
        {previewImage ? (
          <DialogContent
            className={cn(
              'border-border/70 bg-background/96 p-3 sm:p-4',
              publicPageMedia.comparisonDialogContent
            )}
            aria-describedby={undefined}
          >
            <DialogTitle className="sr-only">{previewImage.alt}</DialogTitle>
            <div
              style={{ aspectRatio: '4 / 3' }}
              className={cn(
                'border-border/70 bg-muted/30 relative overflow-hidden rounded-lg border',
                publicPageMedia.comparisonDialogFrame,
                publicPageMedia.comparisonDialogLandscapeFrame
              )}
            >
              <Image
                data-slot="replace-ps-preview-image"
                src={previewImage.src}
                alt={previewImage.alt}
                fill
                loader={r2DirectImageLoader}
                sizes="94vw"
                unoptimized
                className="object-contain"
              />

              {previewMode === 'after' && canNavigateActiveSlides ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    data-slot="replace-ps-preview-previous"
                    aria-label={copy.previous}
                    onClick={showPreviousSlide}
                    className="bg-background/85 absolute top-1/2 left-3 z-30 rounded-full shadow-md rtl:right-3 rtl:left-auto"
                  >
                    <ChevronLeftIcon
                      className="size-5 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    data-slot="replace-ps-preview-next"
                    aria-label={copy.next}
                    onClick={showNextSlide}
                    className="bg-background/85 absolute top-1/2 right-3 z-30 rounded-full shadow-md rtl:right-auto rtl:left-3"
                  >
                    <ChevronRightIcon
                      className="size-5 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </Button>
                </>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
