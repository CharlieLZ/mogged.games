import { getLandingShowcaseCopy } from '@/shared/lib/landing-showcase-videos';
import {
  publicPageMedia,
  publicPageTypography,
} from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';

function LandingR2VideoShowcaseFallback({
  locale,
  className,
}: {
  locale?: string;
  className?: string;
}) {
  const copy = getLandingShowcaseCopy(locale);

  return (
    <section
      data-slot="landing-r2-showcase-fallback"
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

        <div aria-hidden="true" className="space-y-3 md:space-y-4">
          {Array.from({ length: 2 }, (_, rowIndex) => (
            <div
              key={`landing-r2-showcase-fallback-row-${rowIndex}`}
              className={cn(
                'flex gap-4 overflow-hidden py-2',
                rowIndex % 2 === 1 && 'justify-end'
              )}
            >
              {Array.from({ length: 3 }, (_, cardIndex) => (
                <div
                  key={`landing-r2-showcase-fallback-card-${rowIndex}-${cardIndex}`}
                  className={cn(
                    'border-border/55 bg-card/92 shrink-0 rounded-[1.35rem] border p-3 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.3)] backdrop-blur-sm',
                    publicPageMedia.videoShowcaseCard
                  )}
                >
                  <div className="mb-3 flex items-center justify-between px-1.5 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-primary/70 size-2 rounded-full" />
                      <span className="bg-muted-foreground/30 size-2 rounded-full" />
                      <span className="bg-muted-foreground/20 size-2 rounded-full" />
                    </div>
                    <div className="bg-muted/60 h-4 w-4 rounded-full" />
                  </div>
                  <div className="border-border/55 bg-muted/40 aspect-video rounded-[1.45rem] border" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingR2VideoShowcaseShell({
  locale,
  className,
}: {
  locale?: string;
  className?: string;
}) {
  return (
    <LandingR2VideoShowcaseFallback locale={locale} className={className} />
  );
}
