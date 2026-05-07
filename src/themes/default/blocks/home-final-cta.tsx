import { Link } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';
import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';
import { CTA as CTAType } from '@/shared/types/blocks/landing';

export function HomeFinalCTA({
  cta,
  className,
}: {
  cta: CTAType;
  className?: string;
}) {
  const buttons =
    cta.buttons?.filter((button) => button.title && button.url) ?? [];

  return (
    <section
      id={cta.id}
      data-slot="home-final-cta-section"
      className={cn('py-12 md:py-20', className)}
    >
      <div className="container">
        <div
          data-slot="home-final-cta-panel"
          className={cn(
            'relative isolate overflow-hidden rounded-[1.75rem] border border-border/70 bg-card px-5 py-12 text-center text-card-foreground shadow-2xl shadow-foreground/5 sm:px-8 sm:py-14 md:min-h-[22rem] md:rounded-[2rem] md:px-10 md:py-16 lg:px-14'
          )}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[12%] top-[-20%] -z-10 h-[18rem] rounded-full bg-primary/12 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 bottom-[-18%] -z-10 size-44 rounded-full bg-chart-2/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[20%] top-0 -z-10 h-px bg-border/70"
          />

          <div
            data-slot="home-final-cta-content"
            className="relative mx-auto max-w-3xl"
          >
            {cta.title ? (
              <h2 className={cn('mx-auto', publicPageTypography.finalCtaTitle)}>
                {cta.title}
              </h2>
            ) : null}

            {cta.description ? (
              <p
                className={cn(
                  'mx-auto text-muted-foreground',
                  publicPageTypography.finalCtaDescription
                )}
              >
                {cta.description}
              </p>
            ) : null}

            {buttons.length > 0 ? (
              <div
                data-slot="home-final-cta-actions"
                className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                {buttons.map((button, idx) => {
                  const resolvedVariant = button.variant || 'default';
                  const isPrimary =
                    idx === 0 && resolvedVariant === 'default';

                  return (
                    <Button
                      asChild
                      key={`${button.title}-${idx}`}
                      size={button.size || 'lg'}
                      variant={resolvedVariant}
                      className={cn(
                        'min-h-12 max-w-full rounded-full px-5 text-center text-sm font-semibold whitespace-normal transition-all duration-200 hover:-translate-y-0.5 focus-visible:ring-[3px] md:px-6',
                        isPrimary
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/20'
                          : resolvedVariant === 'outline'
                            ? 'border-border/80 bg-background/85 text-foreground hover:bg-muted/70'
                            : 'shadow-sm'
                      )}
                    >
                      <Link
                        href={button.url || ''}
                        target={button.target || '_self'}
                      >
                        {button.icon ? (
                          <SmartIcon name={button.icon as string} size={18} />
                        ) : null}
                        <span>{button.title}</span>
                      </Link>
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
