import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';
import { Features as FeaturesType } from '@/shared/types/blocks/landing';

import { SectionIntro } from './section-intro';

export function Features({
  features,
  className,
}: {
  features: FeaturesType;
  className?: string;
}) {
  const isInverse = features.tone === 'inverse';

  return (
    <section
      data-slot="features-section"
      id={features.id}
      className={cn('py-6 md:py-8', features.className, className)}
    >
      <div className="container">
        <div data-slot="features-layout" className="space-y-4 md:space-y-7">
          <SectionIntro
            tone={features.tone}
            label={features.label}
            title={features.title}
            description={features.description}
            className="max-w-4xl"
            maxWidthClassName="max-w-4xl"
            titleClassName="md:text-[1.75rem] lg:text-3xl"
            descriptionClassName={cn(
              'mx-auto max-w-[38rem]',
              publicPageTypography.cardDescription,
              isInverse ? 'text-background/70' : 'text-muted-foreground'
            )}
          />

          <div
            data-slot="features-grid"
            className="mx-auto grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.items?.map((item, idx) => (
              <article
                data-slot="features-card"
                className={cn(
                  'min-h-[10.5rem] rounded-[1.25rem] border p-4 text-center md:min-h-[11rem] lg:p-4.5',
                  isInverse
                    ? 'border-background/12 bg-background/4'
                    : 'border-border/60 bg-background/85 shadow-sm backdrop-blur-sm'
                )}
                key={idx}
              >
                <div
                  className={cn(
                    'mb-3 inline-flex size-8 items-center justify-center rounded-xl border md:mb-4 md:size-9',
                    isInverse
                      ? 'border-background/12 bg-background/4 text-background/90'
                      : 'border-border/60 bg-card/80 text-foreground'
                  )}
                >
                  <SmartIcon name={item.icon as string} size={20} />
                </div>
                <div className="space-y-1.5">
                  <h3
                    data-slot="features-card-title"
                    className={cn(
                      'text-center',
                      publicPageTypography.cardTitle,
                      isInverse ? 'text-background' : 'text-foreground'
                    )}
                  >
                    {item.title}
                  </h3>
                  <p
                    data-slot="features-card-description"
                    className={cn(
                      'mx-auto max-w-[26ch] text-center',
                      publicPageTypography.compactCardDescription,
                      isInverse ? 'text-background/70' : 'text-muted-foreground'
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
