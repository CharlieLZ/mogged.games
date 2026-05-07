'use client';

import { useState } from 'react';
import { PlayIcon, XIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Marquee } from '@/shared/components/ui/marquee';
import {
  getLandingShowcaseCopy,
  getLandingShowcaseVideos,
  type LandingShowcaseVideoItem,
} from '@/shared/lib/landing-showcase-videos';
import {
  publicPageMedia,
  publicPageTypography,
} from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';

function ShowcaseVideoCard({
  aspectRatio,
  onOpen,
  src,
}: {
  aspectRatio: 'landscape' | 'portrait';
  onOpen: () => void;
  src: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-slot="landing-r2-showcase-card"
      className={cn(
        'group border-border/55 bg-card/92 relative shrink-0 overflow-hidden rounded-[1.35rem] border p-3 text-left shadow-[0_20px_60px_-36px_rgba(15,23,42,0.3)] backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 rtl:text-right',
        publicPageMedia.videoShowcaseCard
      )}
    >
      <div className="text-muted-foreground/70 mb-3 flex items-center justify-between px-1.5 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="bg-primary/70 size-2 rounded-full" />
          <span className="bg-muted-foreground/30 size-2 rounded-full" />
          <span className="bg-muted-foreground/20 size-2 rounded-full" />
        </div>
        <XIcon className="h-4 w-4" />
      </div>

      <div className="border-border/55 relative overflow-hidden rounded-[1.45rem] border bg-black">
        <div
          className={cn(
            aspectRatio === 'portrait'
              ? 'mx-auto aspect-[9/16] max-w-[15rem]'
              : 'aspect-video'
          )}
        >
          <video
            data-slot="landing-r2-showcase-video"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            src={src}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/18">
          <div className="rounded-full bg-white/92 p-3 opacity-0 shadow-lg transition duration-300 group-hover:opacity-100">
            <PlayIcon className="h-5 w-5 text-black" />
          </div>
        </div>
      </div>
    </button>
  );
}

export function LandingR2VideoShowcase({
  locale,
  className,
}: {
  locale?: string;
  className?: string;
}) {
  const copy = getLandingShowcaseCopy(locale);
  const videos = getLandingShowcaseVideos(locale);
  const [selectedVideo, setSelectedVideo] =
    useState<LandingShowcaseVideoItem | null>(null);
  const marqueeRows = [
    {
      direction: 'forward' as const,
      videos: videos.filter((_, index) => index % 2 === 0),
      className: '[--duration:56s] [--gap:1.4rem]',
      reverse: false,
    },
    {
      direction: 'reverse' as const,
      videos: videos.filter((_, index) => index % 2 === 1),
      className: '[--duration:62s] [--gap:1.4rem]',
      reverse: true,
    },
  ];

  if (!videos.length) {
    return null;
  }

  return (
    <>
      <section
        data-slot="landing-r2-showcase"
        className={cn('bg-muted/20 overflow-hidden py-10 md:py-16', className)}
      >
        <div className="container space-y-6 md:space-y-8">
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

          <div className="relative space-y-3 md:space-y-4">
            <div className="from-background via-background/75 pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r to-transparent md:w-28 rtl:right-0 rtl:left-auto rtl:bg-gradient-to-l" />
            <div className="from-background via-background/75 pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l to-transparent md:w-28 rtl:right-auto rtl:left-0 rtl:bg-gradient-to-r" />

            {marqueeRows.map((row) => (
              <Marquee
                key={row.direction}
                data-slot="landing-r2-showcase-marquee-row"
                data-direction={row.direction}
                pauseOnHover
                reverse={row.reverse}
                repeat={2}
                className={cn('py-2', row.className)}
              >
                {row.videos.map((item) => (
                  <ShowcaseVideoCard
                    key={item.id}
                    aspectRatio={item.aspectRatio}
                    src={item.src}
                    onOpen={() => setSelectedVideo(item)}
                  />
                ))}
              </Marquee>
            ))}
          </div>
        </div>
      </section>

      <Dialog
        open={selectedVideo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVideo(null);
          }
        }}
      >
        {selectedVideo ? (
          <DialogContent
            className={cn(
              'border-border/70 bg-background/96 p-4 sm:p-5',
              selectedVideo.aspectRatio === 'portrait'
                ? 'max-w-xl'
                : 'max-w-5xl'
            )}
            showCloseButton
            aria-describedby={undefined}
          >
            <DialogTitle className="sr-only">{selectedVideo.title}</DialogTitle>
            <div className="border-border/60 rounded-2xl border bg-black/90 p-1">
              <div
                className={cn(
                  selectedVideo.aspectRatio === 'portrait'
                    ? 'mx-auto aspect-[9/16] max-w-[22rem]'
                    : 'aspect-video'
                )}
              >
                <video
                  className="block h-full w-full rounded-[calc(1rem-2px)] object-contain"
                  src={selectedVideo.src}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
