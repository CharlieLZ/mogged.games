import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';

export function SectionHeader({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'container space-y-6 py-16 text-center md:py-24',
        className
      )}
    >
      <h2 className={cn('text-center', publicPageTypography.sectionHeading)}>
        {title}
      </h2>
      <p className={publicPageTypography.cardDescription}>{description}</p>
    </div>
  );
}
