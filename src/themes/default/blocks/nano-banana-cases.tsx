'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, CheckIcon, CopyIcon, Maximize2, X } from 'lucide-react';
import { Link } from '@/core/i18n/navigation';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  publicPageMedia,
  publicPageTypography,
} from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';
import { type NanoBananaCases as NanoBananaCasesBlock } from '@/shared/types/blocks/landing';

export type { NanoBananaCasesBlock };

type CopyState = 'idle' | 'copied' | 'failed';
type NanoBananaCase = NonNullable<NanoBananaCasesBlock['items']>[number];

type CopyFeedback = {
  itemId: string;
  state: CopyState;
};

type PreviewState = {
  alt: string;
  src: string;
  title: string;
};

const NANO_BANANA_CASE_IMAGE_WIDTH = 1600;
const NANO_BANANA_CASE_IMAGE_HEIGHT = 1200;

const caseImageFrameClassName = cn(
  'group/image bg-muted/30 focus-visible:ring-ring focus-visible:ring-offset-background border-border/70 block w-full overflow-hidden rounded-lg border text-left shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:aspect-[16/11] rtl:text-right',
  publicPageMedia.comparisonFrame
);

const caseTitleClassName = 'text-xl leading-7 md:text-[1.625rem] md:leading-8';

const caseBodyCopyClassName =
  'text-[0.8125rem] leading-5 md:text-[0.875rem] md:leading-6';

const casePromptLabelClassName = 'text-xs font-semibold';

const caseLinkClassName = 'text-sm';

function hasRenderableCase(
  item: NanoBananaCase | null | undefined
): item is NanoBananaCase {
  return Boolean(
    item?.id?.trim() &&
    item.title?.trim() &&
    item.description?.trim() &&
    item.prompt?.trim() &&
    item.image?.src?.trim() &&
    item.image?.alt?.trim()
  );
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

async function copyPrompt(prompt: string, itemId: string) {
  if (!prompt.trim()) {
    throw new Error(`[nano-banana-cases] missing prompt for ${itemId}`);
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(prompt);
      return;
    }

    copyTextWithTextarea(prompt);
  } catch (error) {
    console.error('[nano-banana-cases] copy prompt failed', {
      error,
      itemId,
      step: 'copy_prompt',
    });
    throw error;
  }
}

function CaseImage({
  actionLabel,
  alt,
  fallback,
  onOpen,
  priority,
  src,
}: {
  actionLabel: string;
  alt: string;
  fallback: string;
  onOpen: () => void;
  priority?: boolean;
  src: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <button
      type="button"
      data-slot="nano-banana-case-image-button"
      onClick={onOpen}
      aria-label={actionLabel}
      className={caseImageFrameClassName}
    >
      {failed ? (
        <span className="text-muted-foreground flex h-full w-full items-center justify-center p-4 text-center text-sm">
          {fallback}
        </span>
      ) : (
        <Image
          data-slot="nano-banana-case-image"
          src={src}
          alt={alt}
          priority={priority}
          width={NANO_BANANA_CASE_IMAGE_WIDTH}
          height={NANO_BANANA_CASE_IMAGE_HEIGHT}
          sizes="(max-width: 1024px) 92vw, 560px"
          unoptimized
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition duration-500 group-hover/image:scale-[1.02]"
        />
      )}
      <span className="bg-background/88 text-foreground border-border/70 absolute right-3 bottom-3 inline-flex size-9 items-center justify-center rounded-full border shadow-sm backdrop-blur rtl:right-auto rtl:left-3">
        <Maximize2 className="size-4" aria-hidden="true" />
      </span>
    </button>
  );
}

export function NanoBananaCases({
  cases,
  className,
}: {
  cases: NanoBananaCasesBlock;
  className?: string;
}) {
  const labels = cases.labels ?? {};
  const items = useMemo(
    () => (cases.items ?? []).filter(hasRenderableCase),
    [cases.items]
  );
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>({
    itemId: '',
    state: 'idle',
  });
  const [pendingCopyId, setPendingCopyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  useEffect(() => {
    if (copyFeedback.state === 'idle') {
      return;
    }

    const timeout = window.setTimeout(
      () => setCopyFeedback({ itemId: '', state: 'idle' }),
      2000
    );

    return () => window.clearTimeout(timeout);
  }, [copyFeedback]);

  if (!cases.title?.trim() || items.length === 0) {
    return null;
  }

  const handleCopy = async (item: NanoBananaCase) => {
    if (pendingCopyId) {
      return;
    }

    setPendingCopyId(item.id ?? 'unknown');
    try {
      await copyPrompt(item.prompt ?? '', item.id ?? 'unknown');
      setCopyFeedback({ itemId: item.id ?? '', state: 'copied' });
    } catch {
      setCopyFeedback({ itemId: item.id ?? '', state: 'failed' });
    } finally {
      setPendingCopyId(null);
    }
  };

  return (
    <>
      <section
        id={cases.id}
        data-slot="nano-banana-cases"
        className={cn(
          'from-muted/40 via-background to-background overflow-hidden bg-gradient-to-b py-10 md:py-16',
          cases.className,
          className
        )}
      >
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <h2
              className={cn(
                'text-foreground text-balance',
                publicPageTypography.sectionHeading
              )}
            >
              {cases.title}
            </h2>
            {cases.description ? (
              <p
                className={cn(
                  'text-muted-foreground mx-auto max-w-3xl',
                  publicPageTypography.sectionDescription
                )}
              >
                {cases.description}
              </p>
            ) : null}
          </div>

          <div
            className={cn(
              'relative mx-auto mt-8 flex flex-col gap-8 md:mt-10 md:gap-10 lg:gap-12',
              publicPageMedia.comparisonPanel
            )}
          >
            {items.map((item, index) => {
              const imageActionLabel = labels.openImage
                ? `${labels.openImage}: ${item.title}`
                : (item.title ?? '');
              const itemCopyState =
                copyFeedback.itemId === item.id ? copyFeedback.state : 'idle';
              const isCopyPending = pendingCopyId === item.id;

              return (
                <article
                  key={item.id}
                  data-slot="nano-banana-case-card"
                  data-case-id={item.id}
                  className="grid min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:items-center lg:gap-10"
                >
                  <div className="relative min-w-0">
                    <CaseImage
                      actionLabel={imageActionLabel}
                      alt={item.image?.alt ?? item.title ?? ''}
                      fallback={labels.imageUnavailable ?? ''}
                      priority={index === 0}
                      src={item.image?.src ?? ''}
                      onOpen={() => {
                        setPreview({
                          alt: item.image?.alt ?? item.title ?? '',
                          src: item.image?.src ?? '',
                          title: item.title ?? '',
                        });
                      }}
                    />
                  </div>

                  <div className="min-w-0 space-y-5 lg:space-y-6">
                    <div className="space-y-4">
                      <h3
                        className={cn(
                          'text-foreground',
                          publicPageTypography.caseTitle,
                          caseTitleClassName
                        )}
                      >
                        {item.title}
                      </h3>
                      <p
                        className={cn(
                          'text-muted-foreground',
                          publicPageTypography.cardDescription,
                          caseBodyCopyClassName
                        )}
                      >
                        {item.description}
                      </p>
                    </div>

                    <div className="border-border/70 bg-card/80 rounded-lg border p-4 shadow-sm">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <p
                          className={cn(
                            'text-primary',
                            casePromptLabelClassName
                          )}
                        >
                          {labels.prompt}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-slot="nano-banana-case-copy"
                          onClick={() => handleCopy(item)}
                          disabled={Boolean(pendingCopyId) || isCopyPending}
                          aria-label={labels.copyPrompt}
                          title={labels.copyPrompt}
                        >
                          {itemCopyState === 'copied' ? (
                            <CheckIcon className="size-4" />
                          ) : (
                            <CopyIcon className="size-4" />
                          )}
                        </Button>
                      </div>
                      <p
                        data-slot="nano-banana-case-prompt-text"
                        className={cn(
                          'text-foreground/85',
                          publicPageTypography.cardDescription,
                          caseBodyCopyClassName
                        )}
                      >
                        {item.prompt}
                      </p>
                    </div>

                    {item.button?.title && item.button.url ? (
                      item.button.url.startsWith('/') ? (
                        <Link
                          href={item.button.url}
                          target={item.button.target ?? '_self'}
                          className={cn(
                            'text-primary hover:text-primary/88 focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-2 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none rtl:flex-row-reverse',
                            caseLinkClassName
                          )}
                        >
                          <span>{item.button.title}</span>
                          <ArrowRight className="size-5 rtl:rotate-180" />
                        </Link>
                      ) : (
                        <a
                          href={item.button.url}
                          target={item.button.target ?? '_self'}
                          className={cn(
                            'text-primary hover:text-primary/88 focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-2 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none rtl:flex-row-reverse',
                            caseLinkClassName
                          )}
                        >
                          <span>{item.button.title}</span>
                          <ArrowRight className="size-5 rtl:rotate-180" />
                        </a>
                      )
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreview(null);
          }
        }}
      >
        {preview ? (
          <DialogContent
            data-slot="nano-banana-case-dialog"
            showCloseButton={false}
            className="border-border/70 bg-background/96 max-w-[min(94vw,72rem)] gap-0 p-3 sm:max-w-[min(94vw,72rem)] sm:p-4"
          >
            <DialogTitle className="sr-only">{preview.title}</DialogTitle>
            <DialogDescription className="sr-only">
              {labels.enlargedImage}
            </DialogDescription>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                data-slot="nano-banana-case-dialog-close"
                aria-label={labels.closeImage}
                className="absolute top-4 right-4 z-10 rounded-full rtl:right-auto rtl:left-4"
              >
                <X className="size-4" />
              </Button>
            </DialogClose>
            <div
              style={{ aspectRatio: '4 / 3' }}
              className={cn(
                'border-border/70 bg-muted/30 overflow-hidden rounded-lg border',
                publicPageMedia.comparisonDialogFrame
              )}
            >
              <Image
                src={preview.src}
                alt={preview.alt}
                width={NANO_BANANA_CASE_IMAGE_WIDTH}
                height={NANO_BANANA_CASE_IMAGE_HEIGHT}
                sizes="94vw"
                unoptimized
                className="h-full w-full object-contain"
              />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
