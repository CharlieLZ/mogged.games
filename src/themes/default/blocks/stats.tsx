import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { Stats as StatsType } from '@/shared/types/blocks/landing';

import { SectionIntro } from './section-intro';

export function Stats({
  stats,
  className,
}: {
  stats: StatsType;
  className?: string;
}) {
  return (
    <section
      id={stats.id}
      className={`py-12 md:py-24 ${stats.className} ${className}`}
    >
      <div className={`container space-y-8 md:space-y-16`}>
        <SectionIntro
          label={stats.label}
          title={stats.title}
          description={stats.description}
          className="relative z-10 max-w-xl"
        />

        <div className="grid gap-12 divide-y *:text-center md:grid-cols-3 md:gap-2 md:divide-x md:divide-y-0">
          {stats.items?.map((item, idx) => (
            <div className="space-y-4" key={idx}>
              <h3 className="sr-only">
                {item.title} {item.description}
              </h3>
              <div className={`text-primary ${publicPageTypography.statValue}`}>
                {item.title}
              </div>
              <p className={publicPageTypography.cardDescription}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
