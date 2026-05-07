'use client';

/* eslint-disable @next/next/no-img-element -- Gallery assets are pre-hosted R2 files and should bypass Next image optimization. */
import { useMemo, useState, type CSSProperties } from 'react';
import {
  Copy,
  ImageIcon,
  Maximize2,
  Sparkles,
  Video,
  WandSparkles,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Marquee } from '@/shared/components/ui/marquee';
import { buildImageToVideoGeneratorHref } from '@/shared/lib/ai-video-generator-route';
import {
  dispatchImageGeneratorApplyPrompt,
  IMAGE_GENERATOR_WORKSPACE_ID,
  type ImageGeneratorApplyPromptMode,
} from '@/shared/lib/image-generator-prompt-event';
import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';

import {
  NANO_IMAGE_GALLERY_ITEMS,
  type NanoImageGalleryItem,
} from './nano-image-gallery';

export type { NanoImageGalleryItem };

const GALLERY_CARD_STYLE = {
  width: 'clamp(18rem, 72vw, 20rem)',
  height: 'clamp(25rem, 78vw, 28rem)',
} satisfies CSSProperties;
const DIALOG_CONTENT_STYLE = {
  width: 'calc(100vw - 2rem)',
  maxWidth: '72rem',
  maxHeight: 'calc(100dvh - 2rem)',
} satisfies CSSProperties;
const DIALOG_MEDIA_STYLE = {
  height: 'clamp(18rem, 55vw, 40rem)',
} satisfies CSSProperties;
const PROMPT_PANEL_STYLE = {
  maxHeight: 'min(40dvh, 25rem)',
} satisfies CSSProperties;
const MARQUEE_STYLE = {
  '--duration': '120s',
  '--gap': '1rem',
} as CSSProperties;

type NanoImageGalleryShowcaseProps = {
  items?: readonly NanoImageGalleryItem[] | null;
  className?: string;
};

function hasRenderableGalleryItem(
  item: NanoImageGalleryItem | null | undefined
): item is NanoImageGalleryItem {
  return Boolean(
    item?.id?.trim() &&
    item.title?.trim() &&
    item.category?.trim() &&
    item.image?.trim() &&
    item.prompt?.trim()
  );
}

function getGallerySeoCaption(item: NanoImageGalleryItem) {
  return `AI image editor example for ${item.title}. Open mogged to inspect the result and reuse the full prompt.`;
}

function scrollToImageWorkspace() {
  const workspace = document.getElementById(IMAGE_GENERATOR_WORKSPACE_ID);

  if (typeof workspace?.scrollIntoView !== 'function') {
    return;
  }

  workspace.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

async function copyPrompt(item: NanoImageGalleryItem) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(item.prompt);
      toast.success('Prompt copied.');
      return;
    }

    if (typeof document === 'undefined') {
      toast.error('Could not copy prompt.');
      return;
    }

    const input = document.createElement('textarea');
    input.value = item.prompt;
    input.setAttribute('readonly', 'true');
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(input);

    if (copied) {
      toast.success('Prompt copied.');
      return;
    }

    toast.error('Could not copy prompt.');
  } catch (error) {
    console.warn('[nano-image-gallery] copy prompt failed', {
      step: 'copy_prompt',
      itemId: item.id,
      error,
    });
    toast.error('Could not copy prompt.');
  }
}

function applyGalleryItemToGenerator(
  item: NanoImageGalleryItem,
  mode: ImageGeneratorApplyPromptMode,
  includeReference = false
) {
  const applied = dispatchImageGeneratorApplyPrompt({
    prompt: item.prompt,
    mode,
    ...(includeReference ? { sourceImageUrl: item.image } : {}),
  });

  if (!applied) {
    console.warn('[nano-image-gallery] prompt event skipped', {
      step: 'apply_prompt',
      itemId: item.id,
    });
    return;
  }

  scrollToImageWorkspace();
}

function GalleryActions({
  item,
  dense = false,
  includePrompt = true,
}: {
  item: NanoImageGalleryItem;
  dense?: boolean;
  includePrompt?: boolean;
}) {
  const locale = useLocale();
  const imageToVideoHref = buildImageToVideoGeneratorHref({
    imageUrl: item.image,
    locale,
  });

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2',
        dense ? 'justify-start' : 'justify-center'
      )}
    >
      {includePrompt ? (
        <Button
          type="button"
          size={dense ? 'default' : 'sm'}
          data-slot="nano-gallery-use-prompt"
          onClick={(event) => {
            event.stopPropagation();
            applyGalleryItemToGenerator(item, 'text-to-image');
          }}
          className={dense ? 'flex-1 sm:flex-none' : undefined}
        >
          <WandSparkles className="size-4" />
          Open Image Editor
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size={dense ? 'default' : 'sm'}
        data-slot="nano-gallery-use-reference"
        onClick={(event) => {
          event.stopPropagation();
          applyGalleryItemToGenerator(item, 'image-to-image', true);
        }}
        className={dense ? 'flex-1 sm:flex-none' : undefined}
      >
        <ImageIcon className="size-4" />
        Use as Reference
      </Button>
      <Button
        asChild
        variant="outline"
        size={dense ? 'default' : 'sm'}
        data-slot="nano-gallery-image-to-video"
        className={dense ? 'flex-1 sm:flex-none' : undefined}
      >
        <a href={imageToVideoHref}>
          <Video className="size-4" />
          Image to Video
        </a>
      </Button>
    </div>
  );
}

function GalleryCard({
  item,
  priority,
  onOpen,
}: {
  item: NanoImageGalleryItem;
  priority?: boolean;
  onOpen: (item: NanoImageGalleryItem) => void;
}) {
  return (
    <article
      data-slot="nano-gallery-card"
      className="group bg-card text-card-foreground border-border/50 relative shrink-0 overflow-hidden rounded-lg border shadow-sm transition-transform duration-300 hover:-translate-y-1"
      style={GALLERY_CARD_STYLE}
    >
      <button
        type="button"
        data-slot="nano-gallery-card-open"
        onClick={() => onOpen(item)}
        className="focus-visible:ring-ring/50 absolute inset-0 text-left focus-visible:ring-3 focus-visible:outline-none"
        aria-label={`Open prompt details for ${item.title}`}
      >
        <img
          src={item.image}
          alt={`${item.title} generated example`}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="bg-background/85 text-foreground border-border/50 absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-md border opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <Maximize2 className="size-4" />
        </span>
      </button>

      <div className="from-foreground/90 via-foreground/65 text-background pointer-events-none absolute inset-x-0 bottom-0 space-y-3 bg-gradient-to-t to-transparent p-4 pt-16 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <div className="space-y-1.5">
          <Badge variant="secondary" className="rounded-full">
            {item.category}
          </Badge>
          <p
            data-slot="nano-gallery-card-title"
            className="line-clamp-2 text-lg leading-tight font-semibold"
          >
            {item.title}
          </p>
          <p className="text-background/85 line-clamp-3 text-sm leading-5">
            {getGallerySeoCaption(item)}
          </p>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            data-slot="nano-gallery-copy"
            aria-label={`Copy prompt for ${item.title}`}
            title="Copy Prompt"
            onClick={(event) => {
              event.stopPropagation();
              void copyPrompt(item);
            }}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            data-slot="nano-gallery-use-prompt"
            onClick={(event) => {
              event.stopPropagation();
              applyGalleryItemToGenerator(item, 'text-to-image');
            }}
          >
            <WandSparkles className="size-4" />
            Open Image Editor
          </Button>
        </div>
      </div>
    </article>
  );
}

function GalleryDetailsDialog({
  item,
  open,
  onOpenChange,
}: {
  item: NanoImageGalleryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="nano-gallery-dialog"
        className="overflow-y-auto p-0 lg:overflow-hidden"
        style={DIALOG_CONTENT_STYLE}
      >
        <div className="grid min-h-0 lg:grid-cols-2">
          <div className="bg-muted/25 relative" style={DIALOG_MEDIA_STYLE}>
            <img
              src={item.image}
              alt={`${item.title} enlarged generated example`}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex min-h-0 flex-col gap-5 p-5 md:p-6">
            <DialogHeader className="text-left">
              <DialogTitle className="pr-8 text-2xl leading-tight md:text-3xl">
                {item.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-muted-foreground font-semibold">
                    Categories:
                  </span>
                  <Badge variant="secondary" className="rounded-full">
                    {item.category}
                  </Badge>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Prompt
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm italic">
                    Tip: English prompts usually deliver better generation
                    quality
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyPrompt(item)}
                >
                  <Copy className="size-4" />
                  Copy Prompt
                </Button>
              </div>

              <div
                className="bg-muted/35 border-border/60 overflow-y-auto rounded-lg border p-4"
                style={PROMPT_PANEL_STYLE}
              >
                <pre className="text-foreground/90 p-0 font-mono text-sm leading-6 break-words whitespace-pre-wrap">
                  {item.prompt}
                </pre>
              </div>
            </div>

            <div className="border-border/60 mt-auto space-y-3 border-t pt-4">
              <Button
                type="button"
                className="h-12 w-full text-base"
                onClick={() =>
                  applyGalleryItemToGenerator(item, 'text-to-image')
                }
              >
                <Sparkles className="size-5" />
                Open Image Editor
              </Button>
              <GalleryActions item={item} dense includePrompt={false} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NanoImageGalleryShowcase({
  items = NANO_IMAGE_GALLERY_ITEMS,
  className,
}: NanoImageGalleryShowcaseProps) {
  const safeItems = useMemo(
    () => (items ?? []).filter(hasRenderableGalleryItem),
    [items]
  );
  const [selectedItem, setSelectedItem] = useState<NanoImageGalleryItem | null>(
    null
  );

  if (safeItems.length === 0) {
    return null;
  }

  return (
    <section
      data-slot="image-generator-gallery"
      className={cn('bg-muted/20 overflow-hidden py-10 md:py-14', className)}
    >
      <div className="container space-y-6">
        <div className="mx-auto max-w-5xl space-y-3 text-center">
          <Badge variant="outline" className="bg-background/80 rounded-full">
            Nano Banana Pro Prompt Gallery
          </Badge>
          <h2 className={publicPageTypography.sectionHeading}>
            See What mogged Can Generate
          </h2>
          <p
            data-slot="nano-gallery-description"
            className={cn(
              'text-muted-foreground lg:whitespace-nowrap',
              publicPageTypography.cardDescription
            )}
          >
            Browse ready-to-use image prompts, copy a prompt, reuse an image as
            reference, or send the idea straight back to the generator.
          </p>
        </div>

        <div className="relative">
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-14 bg-gradient-to-r to-transparent md:block" />
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-14 bg-gradient-to-l to-transparent md:block" />
          <Marquee
            data-slot="nano-gallery-marquee"
            pauseOnHover
            repeat={2}
            className="py-2"
            style={MARQUEE_STYLE}
          >
            {safeItems.map((item, index) => (
              <GalleryCard
                key={item.id}
                item={item}
                priority={index < 3}
                onOpen={setSelectedItem}
              />
            ))}
          </Marquee>
        </div>
      </div>

      <GalleryDetailsDialog
        item={selectedItem}
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
          }
        }}
      />
    </section>
  );
}
