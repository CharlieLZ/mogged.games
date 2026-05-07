import { ArrowRight } from 'lucide-react';
import { Link } from '@/core/i18n/navigation';

import {
  publicPageMedia,
  publicPageTypography,
} from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';
import {
  UseCaseItem,
  UseCases as UseCasesType,
} from '@/shared/types/blocks/landing';

import { SectionIntro } from './section-intro';

function UseCaseCopyCard({ item }: { item: UseCaseItem }) {
  const cta = item.button;

  if (!item.title) {
    return null;
  }

  return (
    <div
      data-slot="use-case-copy-card"
      className={cn(
        'border-border/55 bg-card/92 text-card-foreground mx-auto rounded-[1.35rem] border p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] md:p-5 lg:mx-0',
        publicPageMedia.useCaseCard
      )}
    >
      <h3 data-slot="use-case-title" className={publicPageTypography.cardTitle}>
        {item.title}
      </h3>

      {item.description ? (
        <p
          data-slot="use-case-description"
          className={cn(
            'text-muted-foreground mt-2',
            publicPageTypography.cardDescription
          )}
        >
          {item.description}
        </p>
      ) : null}

      {cta?.title && cta.url ? (
        <div
          data-slot="use-case-cta-wrap"
          className="mt-3.5 flex justify-start rtl:justify-end"
        >
          {cta.url.startsWith('/') ? (
            <Link
              data-slot="use-case-cta"
              href={cta.url}
              target={cta.target ?? '_self'}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 w-auto shrink-0 items-center gap-1.5 self-start rounded-full px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md rtl:flex-row-reverse rtl:text-right"
            >
              <span>{cta.title}</span>
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          ) : (
            <a
              data-slot="use-case-cta"
              href={cta.url}
              target={cta.target ?? '_self'}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 w-auto shrink-0 items-center gap-1.5 self-start rounded-full px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md rtl:flex-row-reverse rtl:text-right"
            >
              <span>{cta.title}</span>
              <ArrowRight className="size-4 rtl:rotate-180" />
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}

function UseCaseVideoCard({ item }: { item: UseCaseItem }) {
  if (!item.video_url || !item.title) {
    return null;
  }

  const mediaFitClass =
    item.media_fit === 'contain' ? 'object-contain' : 'object-cover';
  const usePortraitFrame = item.media_fit === 'contain';

  return (
    <div
      data-slot="use-case-video-shell"
      className={cn(
        'border-border/55 bg-card/72 relative mx-auto flex items-center justify-center rounded-[1.35rem] border p-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.16)] md:p-3.5 lg:mx-0',
        publicPageMedia.useCaseCard
      )}
    >
      <div
        aria-hidden="true"
        className="bg-primary/10 pointer-events-none absolute inset-x-8 top-5 h-[4rem] rounded-full blur-3xl"
      />

      <div
        data-slot="use-case-video-frame"
        data-media-orientation={usePortraitFrame ? 'portrait' : 'landscape'}
        className={cn(
          'ring-border/45 relative overflow-hidden rounded-[1.5rem] shadow-[0_24px_55px_-28px_rgba(15,23,42,0.28)] ring-1',
          usePortraitFrame
            ? publicPageMedia.useCaseVideoPortrait
            : publicPageMedia.useCaseVideoLandscape
        )}
      >
        <video
          aria-label={item.title}
          suppressHydrationWarning
          className={cn(
            'block h-full w-full transition duration-500',
            mediaFitClass
          )}
          src={item.video_url}
          poster={item.image?.src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      </div>
    </div>
  );
}

function UseCaseRow({
  item,
  reverse = false,
  centerCopy = false,
}: {
  item: UseCaseItem;
  reverse?: boolean;
  centerCopy?: boolean;
}) {
  if (!item.video_url || !item.title) {
    return null;
  }

  return (
    <article data-slot="use-case-row" className={publicPageMedia.useCaseGrid}>
      <div
        data-slot="use-case-copy"
        className={cn(
          'order-1 self-start',
          reverse && 'lg:order-2',
          centerCopy && 'lg:self-center'
        )}
      >
        <UseCaseCopyCard item={item} />
      </div>

      <div
        data-slot="use-case-media"
        className={cn('order-2 self-start', reverse && 'lg:order-1')}
      >
        <UseCaseVideoCard item={item} />
      </div>
    </article>
  );
}

function UseCasePairedGrid({
  leftItem,
  rightItem,
}: {
  leftItem: UseCaseItem;
  rightItem: UseCaseItem;
}) {
  if (
    !leftItem.title ||
    !rightItem.title ||
    !leftItem.video_url ||
    !rightItem.video_url
  ) {
    return null;
  }

  return (
    <section
      data-slot="use-case-paired-grid"
      className={publicPageMedia.useCasePairedGrid}
    >
      <div
        data-slot="use-case-paired-copy-row"
        className={publicPageMedia.useCasePairedColumns}
      >
        <div data-slot="use-case-paired-copy-left">
          <UseCaseCopyCard item={leftItem} />
        </div>
        <div data-slot="use-case-paired-copy-right">
          <UseCaseCopyCard item={rightItem} />
        </div>
      </div>

      <div
        data-slot="use-case-paired-media-row"
        className={publicPageMedia.useCasePairedColumns}
      >
        <div data-slot="use-case-paired-media-left">
          <UseCaseVideoCard item={leftItem} />
        </div>
        <div data-slot="use-case-paired-media-right">
          <UseCaseVideoCard item={rightItem} />
        </div>
      </div>
    </section>
  );
}

export function UseCasesShowcase({
  useCases,
  className,
}: {
  useCases: UseCasesType;
  className?: string;
}) {
  const items = useCases.items ?? [];
  const leadingItems = items.slice(0, 2);
  const pairedItems = items.slice(2, 4);
  const hasPairedGrid = pairedItems.length === 2;

  if (!items.length) {
    return null;
  }

  return (
    <section
      id={useCases.id}
      className={cn(
        'from-primary/6 via-background to-background overflow-hidden bg-gradient-to-b py-10 md:py-16',
        useCases.className,
        className
      )}
    >
      <div className="container space-y-5 md:space-y-7">
        <SectionIntro
          label={useCases.label}
          title={useCases.title}
          description={useCases.description}
          maxWidthClassName="max-w-2xl"
        />

        <div className="space-y-4 md:space-y-5">
          {leadingItems.map((item, index) => (
            <UseCaseRow
              item={item}
              key={`${item.title ?? 'use-case'}-${index}`}
              reverse={index % 2 === 1}
              centerCopy={index === 1}
            />
          ))}

          {hasPairedGrid ? (
            <UseCasePairedGrid
              leftItem={pairedItems[0]}
              rightItem={pairedItems[1]}
            />
          ) : (
            pairedItems.map((item, index) => (
              <UseCaseRow
                item={item}
                key={`${item.title ?? 'use-case'}-${index + 2}`}
                reverse={(index + 2) % 2 === 1}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
