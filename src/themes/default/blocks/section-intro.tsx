import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';

type SectionIntroTone = 'default' | 'inverse';
type SectionIntroAlign = 'left' | 'center';

export function SectionIntro({
  label,
  title,
  description,
  descriptionHtml,
  align = 'center',
  tone = 'default',
  className,
  labelClassName,
  titleClassName,
  descriptionClassName,
  maxWidthClassName,
}: {
  label?: string;
  title?: string;
  description?: string;
  descriptionHtml?: string;
  align?: SectionIntroAlign;
  tone?: SectionIntroTone;
  className?: string;
  labelClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  maxWidthClassName?: string;
}) {
  if (!label && !title && !description && !descriptionHtml) {
    return null;
  }

  const isInverse = tone === 'inverse';
  const alignmentClass =
    align === 'left' ? 'text-left' : 'mx-auto text-center text-balance';

  return (
    <div
      data-slot="section-intro"
      className={cn(
        alignmentClass,
        maxWidthClassName ?? (align === 'left' ? 'max-w-2xl' : 'max-w-3xl'),
        className
      )}
    >
      {label ? (
        <p
          data-slot="section-intro-label"
          className={cn(
            publicPageTypography.eyebrow,
            isInverse ? 'text-background/55' : 'text-primary',
            labelClassName
          )}
        >
          {label}
        </p>
      ) : null}
      {title ? (
        <h2
          data-slot="section-intro-title"
          className={cn(
            publicPageTypography.sectionTitle,
            isInverse ? 'text-background' : 'text-foreground',
            titleClassName
          )}
        >
          {title}
        </h2>
      ) : null}
      {descriptionHtml ? (
        <p
          data-slot="section-intro-description"
          className={cn(
            publicPageTypography.sectionDescription,
            isInverse ? 'text-background/70' : 'text-muted-foreground',
            descriptionClassName
          )}
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : description ? (
        <p
          data-slot="section-intro-description"
          className={cn(
            publicPageTypography.sectionDescription,
            isInverse ? 'text-background/70' : 'text-muted-foreground',
            descriptionClassName
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
