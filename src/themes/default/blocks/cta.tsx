import { Link } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { CTA as CTAType } from '@/shared/types/blocks/landing';

import { SectionIntro } from './section-intro';

export function CTA({ cta, className }: { cta: CTAType; className?: string }) {
  const buttons =
    cta.buttons?.filter((button) => button.title && button.url) ?? [];

  return (
    <section id={cta.id} className={cn('py-10 md:py-16', className)}>
      <div className="container">
        <div className="text-center">
          <SectionIntro
            label={cta.label}
            title={cta.title}
            descriptionHtml={cta.description}
            className="max-w-2xl"
          />

          <div className="mt-8 flex flex-wrap justify-center gap-2.5 md:mt-10">
            {buttons.map((button, idx) => (
              <Button
                asChild
                size={button.size || 'default'}
                variant={button.variant || 'default'}
                key={idx}
                className="h-10 rounded-full px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md md:px-5"
              >
                <Link href={button.url || ''} target={button.target || '_self'}>
                  {button.icon && <SmartIcon name={button.icon as string} />}
                  <span>{button.title}</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
