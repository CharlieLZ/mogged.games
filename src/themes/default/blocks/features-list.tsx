import Image from 'next/image';
import Link from 'next/link';

import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';
import {
  publicPageMedia,
  publicPageTypography,
} from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';
import { Features as FeaturesType } from '@/shared/types/blocks/landing';

import { SectionIntro } from './section-intro';

export function FeaturesList({
  features,
  className,
}: {
  features: FeaturesType;
  className?: string;
}) {
  const hasImage = Boolean(features.image?.src);

  return (
    // Prevent horizontal scrolling
    <section className={cn('overflow-x-hidden py-10 md:py-16', className)}>
      <div className="container overflow-x-hidden">
        <div className="flex flex-wrap items-center gap-6 pb-8 md:gap-16 md:pb-10">
          {hasImage && (
            <div className={publicPageMedia.featureImageWrap}>
              <Image
                src={features.image?.src ?? ''}
                alt={features.image?.alt ?? ''}
                width={448}
                height={269}
                sizes="(max-width: 768px) 92vw, 448px"
                className="h-auto w-full rounded-lg object-cover"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
            </div>
          )}
          <div className="w-full min-w-0 flex-1">
            <SectionIntro
              align="left"
              label={features.label}
              title={features.title}
              description={features.description}
              className="text-balance break-words"
              titleClassName="break-words"
              descriptionClassName="mt-4 mb-5 text-balance break-words"
            />

            {features.buttons && features.buttons.length > 0 && (
              <div className="flex flex-wrap items-center justify-start gap-2">
                {features.buttons?.map((button, idx) => (
                  <Button
                    asChild
                    key={idx}
                    variant={button.variant || 'default'}
                    size={button.size || 'default'}
                    className="h-9 rounded-md px-4 py-2"
                  >
                    <Link
                      href={button.url ?? ''}
                      target={button.target ?? '_self'}
                    >
                      {button.icon && (
                        <SmartIcon name={button.icon as string} size={24} />
                      )}
                      {button.title}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative grid min-w-0 grid-cols-1 gap-x-3 gap-y-5 border-t pt-8 break-words sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {features.items?.map((item, idx) => (
            <div className="min-w-0 space-y-2.5 break-words" key={idx}>
              <div className="flex min-w-0 items-center gap-2">
                {item.icon && (
                  <SmartIcon name={item.icon as string} size={16} />
                )}
                <h3 className="min-w-0 text-sm leading-5 font-medium break-words">
                  {item.title}
                </h3>
              </div>
              <p
                className={cn(
                  'text-muted-foreground min-w-0 break-words',
                  publicPageTypography.compactCardDescription
                )}
              >
                {item.description ?? ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
