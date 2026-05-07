import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';

import { SmartIcon } from './smart-icon';

export function PageHeader({
  title,
  description,
  buttons,
  className,
  contentClassName,
  descriptionClassName,
  titleClassName,
  size = 'default',
}: {
  title?: string;
  description?: string;
  buttons?: {
    title?: string;
    url?: string;
    target?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive';
    icon?: string;
  }[];
  className?: string;
  contentClassName?: string;
  descriptionClassName?: string;
  titleClassName?: string;
  size?: 'default' | 'compact';
}) {
  const paddingClass =
    size === 'compact'
      ? 'pt-[calc(var(--landing-page-top-space-mobile)/2)] pb-3 md:pt-[calc(var(--landing-page-top-space)/2)] md:pb-5'
      : 'pt-[var(--landing-page-top-space-mobile)] pb-6 md:pt-[var(--landing-page-top-space)] md:pb-8';
  const stackClass = size === 'compact' ? 'space-y-2' : 'space-y-3';

  return (
    <section className={cn(paddingClass, className)}>
      <div className="mx-auto max-w-6xl px-6">
        <div
          className={cn(
            publicPageTypography.generatorHeaderContent,
            stackClass,
            contentClassName
          )}
        >
          <h1
            className={cn(publicPageTypography.pageHeaderTitle, titleClassName)}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                publicPageTypography.pageHeaderDescription,
                descriptionClassName
              )}
            >
              {description}
            </p>
          ) : null}
          {buttons?.length ? (
            <div className="flex flex-wrap justify-center gap-3">
              {buttons.map((button, idx) => (
                <Button key={idx} {...button} asChild>
                  <Link
                    href={button.url || ''}
                    target={button.target || '_self'}
                  >
                    {button.icon && <SmartIcon name={button.icon} />}
                    {button.title}
                  </Link>
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
