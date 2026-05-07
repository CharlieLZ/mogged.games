'use client';

/* eslint-disable @next/next/no-img-element -- Showcase assets are curated remote visuals and should stay as direct source URLs. */
import { NanoImageGalleryShowcase } from '@/shared/blocks/generator/nano-image-gallery-showcase';
import { UseCasesShowcase } from '@/shared/blocks/generator/use-cases-showcase';
import {
  type ImageGeneratorShowcaseCopy,
  type ImageGeneratorShowcaseGalleryItem,
  type ImageGeneratorShowcaseSection,
} from '@/shared/lib/ai-image-generator-showcase';
import { cn } from '@/shared/lib/utils';

const SHELL_CLASS_BY_TONE = {
  meadow: 'bg-card border-border/65',
  sky: 'bg-secondary/70 border-border/60',
  sand: 'bg-card border-border/65',
  slate: 'bg-card border-border/65',
} as const;

const VISUAL_FRAME_CLASS_BY_TONE = {
  meadow: 'bg-primary/[0.035] ring-primary/10',
  sky: 'bg-secondary/45 ring-border/50',
  sand: 'bg-muted/70 ring-border/55',
  slate: 'bg-accent/16 ring-accent/20',
} as const;

function ShowcaseImage({
  src,
  alt,
  width,
  height,
  tone,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  tone: ImageGeneratorShowcaseSection['tone'];
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.75rem] p-3 shadow-sm ring-1',
        VISUAL_FRAME_CLASS_BY_TONE[tone]
      )}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        className="border-border/55 bg-background h-auto w-full rounded-[1.35rem] border object-cover"
      />
    </div>
  );
}

function ShowcaseOverviewSection({
  section,
}: {
  section: ImageGeneratorShowcaseSection;
}) {
  const visualFirst = section.imagePosition === 'left';

  return (
    <article
      data-slot="image-generator-showcase-overview"
      className="border-border/65 bg-card rounded-[2.25rem] border shadow-sm"
    >
      <div className="grid items-center gap-8 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:py-8">
        <div
          data-slot="image-generator-showcase-overview-copy"
          className={cn(
            'space-y-5 text-start',
            visualFirst ? 'lg:order-2' : 'lg:order-1'
          )}
        >
          <div className="space-y-3">
            <h2 className="text-foreground text-3xl leading-[1.05] font-semibold sm:text-4xl lg:text-[3.25rem]">
              {section.title}
            </h2>
            <p className="text-muted-foreground max-w-2xl text-base leading-7 sm:text-lg">
              {section.description}
            </p>
          </div>
        </div>

        <div
          data-slot="image-generator-showcase-overview-visual"
          className={cn(
            'from-background via-background to-secondary/35 rounded-[2rem] bg-gradient-to-br p-3',
            visualFirst ? 'lg:order-1' : 'lg:order-2'
          )}
        >
          <ShowcaseImage {...section.image} tone={section.tone} priority />
        </div>
      </div>
    </article>
  );
}

function ShowcaseFeatureSection({
  section,
  priority = false,
}: {
  section: ImageGeneratorShowcaseSection;
  priority?: boolean;
}) {
  const visualFirst = section.imagePosition === 'left';
  const isStatementLayout = section.id === 'story-frame';

  return (
    <article
      data-slot="image-generator-showcase-feature-section"
      className={cn(
        'rounded-[2.25rem] border px-5 py-5 shadow-sm sm:px-6 sm:py-6 lg:px-8 lg:py-8',
        SHELL_CLASS_BY_TONE[section.tone]
      )}
    >
      <div
        className={cn(
          'grid items-center gap-8 lg:gap-10',
          isStatementLayout
            ? 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'
            : 'lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]'
        )}
      >
        <div
          data-slot="image-generator-showcase-feature-visual"
          className={cn(visualFirst ? 'lg:order-1' : 'lg:order-2')}
        >
          <ShowcaseImage
            {...section.image}
            tone={section.tone}
            priority={priority}
          />
        </div>

        <div
          data-slot="image-generator-showcase-feature-copy"
          className={cn(
            'space-y-5 text-start',
            visualFirst ? 'lg:order-2' : 'lg:order-1',
            isStatementLayout ? 'max-w-xl' : 'max-w-2xl'
          )}
        >
          <div className="space-y-3">
            <h2
              className={cn(
                'text-foreground leading-[1.08] font-semibold',
                isStatementLayout
                  ? 'text-3xl sm:text-4xl lg:text-[3rem]'
                  : 'text-2xl sm:text-3xl lg:text-[2.85rem]'
              )}
            >
              {section.title}
            </h2>
            <p className="text-muted-foreground text-base leading-7 sm:text-lg">
              {section.description}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ShowcaseGalleryCard({
  item,
}: {
  item: ImageGeneratorShowcaseGalleryItem;
}) {
  return (
    <article
      data-slot="image-generator-showcase-gallery-item"
      className="border-border/65 bg-card overflow-hidden rounded-[2rem] border shadow-sm"
    >
      <div className="p-3 sm:p-4">
        <ShowcaseImage {...item.image} tone="sand" />
      </div>

      <div className="border-border/60 border-t px-5 py-5 text-start sm:px-6">
        <div className="space-y-1.5">
          <h3 className="text-foreground text-xl leading-tight font-semibold sm:text-2xl">
            {item.title}
          </h3>
        </div>
      </div>
    </article>
  );
}

type ImageGeneratorShowcaseStackProps = {
  content?: ImageGeneratorShowcaseCopy;
  className?: string;
};

export function ImageGeneratorShowcaseStack({
  content,
  className,
}: ImageGeneratorShowcaseStackProps) {
  if (!content) {
    return (
      <div
        data-slot="image-generator-showcase-stack"
        className={cn('contents', className)}
      >
        <NanoImageGalleryShowcase />
        <UseCasesShowcase />
      </div>
    );
  }

  const [overviewSection, ...featureSections] = content.sections;

  if (!overviewSection) {
    return null;
  }

  return (
    <section
      data-slot="image-generator-showcase-stack"
      className={cn(
        'mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:gap-8 lg:py-14',
        className
      )}
    >
      <ShowcaseOverviewSection section={overviewSection} />

      {featureSections.map((section, index) => (
        <ShowcaseFeatureSection
          key={section.id}
          section={section}
          priority={index === 0}
        />
      ))}

      <article
        data-slot="image-generator-showcase-gallery"
        className="border-border/65 bg-card rounded-[2.25rem] border px-5 py-5 shadow-sm sm:px-6 sm:py-6 lg:px-8 lg:py-8"
      >
        <div
          data-slot="image-generator-showcase-gallery-grid"
          className="grid gap-5 sm:grid-cols-2"
        >
          {content.gallery.items.map((item) => (
            <ShowcaseGalleryCard key={item.id} item={item} />
          ))}
        </div>
      </article>
    </section>
  );
}
