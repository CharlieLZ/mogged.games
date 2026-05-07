import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';
import { Features as FeaturesType } from '@/shared/types/blocks/landing';

import { SectionIntro } from './section-intro';

export function FeaturesStep({
  features,
  className,
}: {
  features: FeaturesType;
  className?: string;
}) {
  const isInverse = features.tone === 'inverse';

  return (
    <section
      data-slot="features-step-section"
      id={features.id}
      className={cn('py-10 md:py-16', features.className, className)}
    >
      <div className="container">
        <div
          data-slot="features-step-panel"
          className={cn(
            '@container relative overflow-hidden rounded-[1.75rem] border px-5 py-8 md:px-8 md:py-12',
            isInverse
              ? 'border-background/15 bg-background/4'
              : 'border-border/60 bg-background/70 shadow-sm'
          )}
        >
          <SectionIntro
            tone={isInverse ? 'inverse' : 'default'}
            label={features.label}
            title={features.title}
            description={features.description}
            className="mx-auto max-w-4xl"
            maxWidthClassName="max-w-4xl"
            titleClassName="font-mono"
            descriptionClassName={cn(
              'mx-auto max-w-3xl font-mono',
              isInverse ? 'text-background/68' : 'text-muted-foreground'
            )}
          />

          <div
            data-slot="features-step-list"
            className="mx-auto mt-8 max-w-4xl space-y-4 md:mt-10 md:space-y-5"
          >
            {features.items?.map((item, idx) => (
              <article
                data-slot="features-step-card"
                className={cn(
                  'rounded-[1.35rem] border p-4 md:p-5',
                  isInverse
                    ? 'border-background/15 bg-background/4'
                    : 'border-border/55 bg-card/82 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.14)]'
                )}
                key={idx}
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 md:gap-5">
                  <span
                    data-slot="features-step-index"
                    className={cn(
                      'mt-0.5 flex size-8 items-center justify-center rounded-full text-sm font-semibold md:size-9',
                      isInverse
                        ? 'bg-background/10 text-background/92'
                        : 'bg-primary/12 text-primary'
                    )}
                  >
                    {idx + 1}
                  </span>

                  <div className="min-w-0">
                    <h3
                      data-slot="features-step-card-title"
                      className={cn(
                        'text-base leading-6 font-semibold tracking-tight text-balance md:text-lg md:leading-7',
                        isInverse ? 'text-background' : 'text-foreground'
                      )}
                    >
                      {item.title}
                    </h3>
                    <p
                      data-slot="features-step-card-description"
                      className={cn(
                        'mt-2.5 max-w-3xl',
                        publicPageTypography.cardDescription,
                        isInverse
                          ? 'text-background/68'
                          : 'text-muted-foreground'
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
