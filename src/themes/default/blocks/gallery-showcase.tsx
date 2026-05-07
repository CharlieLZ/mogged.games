import Image from 'next/image';

import { Marquee } from '@/shared/components/ui/marquee';
import {
  publicPageMedia,
  publicPageTypography,
} from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';
import {
  Gallery as GalleryType,
  SectionItem,
} from '@/shared/types/blocks/landing';

import { SectionIntro } from './section-intro';

type GalleryCardItem = SectionItem & {
  type?: 'image' | 'video' | string;
};

function GalleryCard({
  item,
  priority = false,
}: {
  item: GalleryCardItem;
  priority?: boolean;
}) {
  const imageSrc = item.image?.src;
  const videoSrc = item.type === 'video' ? item.url : undefined;

  if (!imageSrc && !videoSrc) {
    return null;
  }

  return (
    <article
      data-slot="gallery-card"
      className={cn(
        'group border-border/55 bg-card/92 text-card-foreground flex shrink-0 snap-start flex-col overflow-hidden rounded-[1.35rem] border shadow-[0_18px_44px_-30px_rgba(15,23,42,0.18)] backdrop-blur-sm rtl:text-right',
        publicPageMedia.galleryCard
      )}
    >
      <div className="border-border/60 bg-background/85 border-b px-4 py-3 md:px-5">
        <p
          data-slot="gallery-card-title"
          className={cn('line-clamp-2', publicPageTypography.cardTitle)}
        >
          {item.title}
        </p>
      </div>

      <div className="border-border/60 bg-muted/40 relative aspect-video overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="bg-primary/10 pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="from-background/15 to-background/25 pointer-events-none absolute inset-0 bg-gradient-to-b via-transparent"
        />

        {videoSrc ? (
          <video
            suppressHydrationWarning
            className="relative block h-full w-full object-cover transition duration-500 group-hover:scale-[1.01]"
            src={videoSrc}
            poster={imageSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : imageSrc ? (
          <Image
            src={imageSrc}
            alt={
              item.image?.alt ?? item.title ?? 'mogged gallery image'
            }
            fill
            priority={priority}
            sizes="(max-width: 640px) 84vw, 400px"
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
        {item.description && (
          <p
            data-slot="gallery-card-description"
            className={cn(
              'text-muted-foreground line-clamp-4 rtl:text-right',
              publicPageTypography.cardDescription
            )}
          >
            {item.description}
          </p>
        )}
      </div>
    </article>
  );
}

export function GalleryShowcase({
  gallery,
  className,
}: {
  gallery: GalleryType;
  className?: string;
}) {
  const items = gallery.items ?? [];

  if (!items.length) {
    return null;
  }

  return (
    <section
      id={gallery.id}
      className={cn(
        'bg-muted/20 overflow-hidden py-10 md:py-16',
        gallery.className,
        className
      )}
    >
      <div className="container space-y-6 md:space-y-8">
        <SectionIntro
          label={gallery.label}
          title={gallery.title}
          description={gallery.description}
        />

        <div className="relative">
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-12 bg-gradient-to-r to-transparent md:block rtl:right-0 rtl:left-auto rtl:bg-gradient-to-l" />
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-12 bg-gradient-to-l to-transparent md:block rtl:right-auto rtl:left-0 rtl:bg-gradient-to-r" />

          <Marquee
            data-slot="gallery-marquee"
            data-direction="right"
            reverse
            pauseOnHover
            repeat={3}
            className="py-2 [--duration:72s] [--gap:1rem]"
          >
            {items.map((item, index) => (
              <GalleryCard
                item={item}
                key={`${item.title ?? 'gallery'}-${index}`}
                priority={index < 3}
              />
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
