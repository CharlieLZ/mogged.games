'use client';

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  Video,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { LazyImage } from '@/shared/blocks/common/lazy-image';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { REWRITE_PROMPT_COST_CREDITS } from '@/shared/lib/prompt-tools';
import { publicPageMedia } from '@/shared/lib/public-page-sizing';

import type { ImageGeneratorMode } from './image-generator-mode';
import type { VideoGeneratorMode } from './video-generator-mode';
import {
  getVideoGeneratorPreviewState,
  type VideoGeneratorPreviewMediaItem,
} from './video-generator-preview-state';

type GeneratorPreviewMode = VideoGeneratorMode | ImageGeneratorMode;

interface VideoGeneratorPreviewProps {
  mode: GeneratorPreviewMode;
  generatedMedia: VideoGeneratorPreviewMediaItem[];
  isGenerating: boolean;
  showSamplePreview: boolean;
  resultsUseVideoIcon: boolean;
  errorMessage?: string | null;
  canRewritePrompt?: boolean;
  isRewritingPrompt?: boolean;
  downloadingMediaId: string | null;
  onDownloadMedia: (media: VideoGeneratorPreviewMediaItem) => void;
  onRewritePrompt?: () => Promise<void> | void;
  translationNamespace?: 'ai.video.generator' | 'ai.image.generator';
}

function resolvePreviewAlt(
  item: VideoGeneratorPreviewMediaItem,
  sampleAlt: string,
  generatedAlt: string
) {
  if (item.alt) {
    return item.alt;
  }

  if (item.prompt) {
    return item.prompt;
  }

  return item.isSample ? sampleAlt : generatedAlt;
}

function getLoopedSampleIndex(
  currentIndex: number,
  total: number,
  direction: 'previous' | 'next'
) {
  if (total <= 1) {
    return 0;
  }

  if (direction === 'previous') {
    return currentIndex <= 0 ? total - 1 : currentIndex - 1;
  }

  return currentIndex >= total - 1 ? 0 : currentIndex + 1;
}

export function VideoGeneratorPreview({
  mode,
  generatedMedia,
  isGenerating,
  showSamplePreview,
  resultsUseVideoIcon,
  errorMessage,
  canRewritePrompt = false,
  isRewritingPrompt = false,
  downloadingMediaId,
  onDownloadMedia,
  onRewritePrompt,
  translationNamespace = 'ai.video.generator',
}: VideoGeneratorPreviewProps) {
  const t = useTranslations(translationNamespace);
  const locale = useLocale();
  const [failedSampleVideoIds, setFailedSampleVideoIds] = useState<string[]>(
    []
  );
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);
  const { previewMedia, showingSampleMedia } = useMemo(
    () =>
      getVideoGeneratorPreviewState({
        mode,
        locale,
        generatedMedia,
        isGenerating,
        showSamplePreview,
      }),
    [generatedMedia, isGenerating, locale, mode, showSamplePreview]
  );
  const shouldShowSampleCarousel =
    showingSampleMedia && previewMedia.length > 1;
  const shouldShowSlidingSampleCarousel =
    shouldShowSampleCarousel &&
    previewMedia.every((item) => item.type === 'image');
  const shouldShowVideoSampleCarousel =
    shouldShowSampleCarousel && !shouldShowSlidingSampleCarousel;
  const sampleCount = previewMedia.length;
  const activeSample =
    shouldShowSampleCarousel && previewMedia[activeSampleIndex]
      ? previewMedia[activeSampleIndex]
      : null;
  const visibleMedia =
    shouldShowSampleCarousel && activeSample ? [activeSample] : previewMedia;
  const previousSampleIndex = getLoopedSampleIndex(
    activeSampleIndex,
    sampleCount,
    'previous'
  );
  const nextSampleIndex = getLoopedSampleIndex(
    activeSampleIndex,
    sampleCount,
    'next'
  );

  const advanceSample = useEffectEvent(() => {
    setActiveSampleIndex((prev) =>
      getLoopedSampleIndex(prev, previewMedia.length, 'next')
    );
  });

  const moveSample = useCallback(
    (direction: 'previous' | 'next') => {
      setActiveSampleIndex((prev) =>
        getLoopedSampleIndex(prev, previewMedia.length, direction)
      );
    },
    [previewMedia.length]
  );

  useEffect(() => {
    setFailedSampleVideoIds([]);
    setActiveSampleIndex(0);
  }, [mode, generatedMedia.length, showSamplePreview]);

  useEffect(() => {
    if (!shouldShowSampleCarousel) {
      return;
    }

    const intervalId = window.setInterval(() => {
      advanceSample();
    }, 4500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [advanceSample, shouldShowSampleCarousel]);

  return (
    <Card
      data-slot="video-generator-preview"
      className="border-border/70 bg-card/90 gap-4 rounded-3xl py-5 shadow-sm"
    >
      <CardHeader className="px-5 pt-0 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          {resultsUseVideoIcon ? (
            <Video className="h-5 w-5" />
          ) : (
            <ImageIcon className="h-5 w-5" />
          )}
          {t('generated_results')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-1 sm:px-6">
        {showingSampleMedia && (
          <div className="bg-muted/60 mb-4 space-y-2 rounded-lg border px-3 py-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t('sample_preview')}</Badge>
              <span className="font-medium">{t('sample_preview_title')}</span>
            </div>
            <p className="text-muted-foreground">
              {t('sample_preview_description')}
            </p>
          </div>
        )}

        {shouldShowSlidingSampleCarousel ? (
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2.5">
              <div
                data-slot="generator-sample-preview-frame"
                className={publicPageMedia.samplePreviewFrame}
              >
                <div
                  data-slot="generator-sample-carousel-track"
                  className="flex h-full w-full transition-transform duration-500 ease-out will-change-transform"
                  style={{
                    transform: `translateX(-${activeSampleIndex * 100}%)`,
                  }}
                >
                  {previewMedia.map((item) => (
                    <div
                      key={item.id}
                      data-slot="generator-sample-carousel-slide"
                      className="relative h-full max-w-full min-w-full shrink-0 overflow-hidden"
                    >
                      <LazyImage
                        src={item.url}
                        alt={resolvePreviewAlt(
                          item,
                          t('sample_generated_image'),
                          t('generated_image')
                        )}
                        wrapperClassName="block h-full w-full"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  data-slot="generator-sample-carousel-previous"
                  aria-label={t('sample_preview_item', {
                    index: previousSampleIndex + 1,
                  })}
                  title={t('sample_preview_item', {
                    index: previousSampleIndex + 1,
                  })}
                  className="bg-background/85 text-foreground hover:bg-background absolute top-1/2 left-3 z-10 size-10 -translate-y-1/2 rounded-full shadow-md backdrop-blur"
                  onClick={() => moveSample('previous')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  data-slot="generator-sample-carousel-next"
                  aria-label={t('sample_preview_item', {
                    index: nextSampleIndex + 1,
                  })}
                  title={t('sample_preview_item', {
                    index: nextSampleIndex + 1,
                  })}
                  className="bg-background/85 text-foreground hover:bg-background absolute top-1/2 right-3 z-10 size-10 -translate-y-1/2 rounded-full shadow-md backdrop-blur"
                  onClick={() => moveSample('next')}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <div
                  data-slot="generator-sample-carousel"
                  className="bg-background/35 absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-2 rounded-full px-2 py-1 backdrop-blur"
                >
                  {previewMedia.map((sample, index) => {
                    const active = index === activeSampleIndex;

                    return (
                      <button
                        key={sample.id}
                        type="button"
                        data-slot="generator-sample-carousel-dot"
                        aria-label={t('sample_preview_item', {
                          index: index + 1,
                        })}
                        aria-pressed={active}
                        onClick={() => setActiveSampleIndex(index)}
                        className={`h-2.5 rounded-full transition-all ${
                          active
                            ? 'bg-primary w-7'
                            : 'bg-background/70 hover:bg-background w-2.5'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : visibleMedia.length > 0 ? (
          <>
            <div
              className={
                visibleMedia.length === 1
                  ? 'grid grid-cols-1 gap-4'
                  : 'grid gap-4 sm:grid-cols-2'
              }
            >
              {visibleMedia.map((item) => (
                <div key={item.id} className="space-y-2.5">
                  <div
                    data-slot={
                      shouldShowSampleCarousel
                        ? 'generator-sample-preview-frame'
                        : undefined
                    }
                    className={`relative overflow-hidden rounded-lg border ${
                      shouldShowSampleCarousel
                        ? item.type === 'image'
                          ? 'mx-auto aspect-[4/5] w-full max-w-[36rem]'
                          : item.aspectRatio === 'portrait'
                            ? publicPageMedia.samplePreviewPortraitVideo
                            : 'aspect-video'
                        : visibleMedia.length === 1
                          ? ''
                          : item.type === 'video'
                            ? 'aspect-video'
                            : 'aspect-square'
                    }`}
                  >
                    {item.type === 'video' ? (
                      item.isSample &&
                      item.posterUrl &&
                      failedSampleVideoIds.includes(item.id) ? (
                        <LazyImage
                          src={item.posterUrl}
                          alt={item.alt || t('sample_preview_poster')}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <video
                          data-slot={
                            shouldShowSampleCarousel
                              ? 'generator-sample-preview-video'
                              : undefined
                          }
                          controls
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload={item.isSample ? 'metadata' : 'auto'}
                          poster={item.posterUrl}
                          className="h-full w-full object-cover"
                          src={item.url}
                          onError={() => {
                            if (!item.isSample) {
                              return;
                            }

                            setFailedSampleVideoIds((prev) =>
                              prev.includes(item.id) ? prev : [...prev, item.id]
                            );
                          }}
                        />
                      )
                    ) : (
                      <LazyImage
                        src={item.url}
                        alt={resolvePreviewAlt(
                          item,
                          t('sample_generated_image'),
                          t('generated_image')
                        )}
                        className={
                          shouldShowSampleCarousel
                            ? 'h-full w-full object-cover'
                            : previewMedia.length === 1
                              ? 'h-auto w-full'
                              : 'h-full w-full object-cover'
                        }
                      />
                    )}

                    {!item.isSample && (
                      <div className="absolute right-2 bottom-2 flex justify-end text-sm">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto"
                          onClick={() => onDownloadMedia(item)}
                          disabled={downloadingMediaId === item.id}
                        >
                          {downloadingMediaId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {shouldShowVideoSampleCarousel ? (
              <div
                data-slot="generator-sample-carousel"
                className="mt-4 flex items-center justify-center gap-2"
              >
                {previewMedia.map((sample, index) => {
                  const active = index === activeSampleIndex;

                  return (
                    <button
                      key={sample.id}
                      type="button"
                      data-slot="generator-sample-carousel-dot"
                      aria-label={t('sample_preview_item', {
                        index: index + 1,
                      })}
                      aria-pressed={active}
                      onClick={() => setActiveSampleIndex(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        active
                          ? 'bg-primary w-7'
                          : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2.5'
                      }`}
                    />
                  );
                })}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
              {resultsUseVideoIcon ? (
                <Video className="text-muted-foreground h-8 w-8" />
              ) : (
                <ImageIcon className="text-muted-foreground h-8 w-8" />
              )}
            </div>
            <p className="text-muted-foreground">
              {isGenerating ? t('ready_to_generate') : t('no_results')}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="border-destructive/40 bg-destructive/10 text-destructive mt-4 space-y-3 rounded-lg border p-4 text-sm">
            <p>{errorMessage}</p>
            {canRewritePrompt && onRewritePrompt ? (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-destructive/80 max-w-2xl text-xs sm:text-sm">
                  {t('form.rewrite_prompt_hint')}{' '}
                  {t('credits_cost', {
                    credits: REWRITE_PROMPT_COST_CREDITS,
                  })}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => void onRewritePrompt()}
                  disabled={isRewritingPrompt}
                >
                  {isRewritingPrompt ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isRewritingPrompt
                    ? t('form.rewriting_prompt')
                    : t('form.rewrite_prompt')}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
