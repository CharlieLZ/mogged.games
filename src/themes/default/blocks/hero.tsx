'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { AnimatedGridPattern } from '@/shared/components/ui/animated-grid-pattern';
import { Button } from '@/shared/components/ui/button';
import { Highlighter } from '@/shared/components/ui/highlighter';
import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';
import { Hero as HeroType } from '@/shared/types/blocks/landing';

import { SocialAvatars } from './social-avatars';

// Smooth scroll handler
const handleSmoothScroll = (
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string
) => {
  if (href.startsWith('#')) {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }
};

const createFadeInVariant = (delay: number) => ({
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(6px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
  },
  transition: {
    duration: 0.6,
    delay,
    ease: [0.22, 1, 0.36, 1] as const,
  },
});

export function Hero({
  hero,
  className,
}: {
  hero: HeroType;
  className?: string;
}) {
  const highlightText = hero.highlight_text ?? '';
  let texts = null;
  if (highlightText) {
    texts = hero.title?.split(highlightText, 2);
  }

  return (
    <>
      <section
        id={hero.id}
        className={`pt-24 pb-4 md:pt-36 md:pb-6 ${hero.className} ${className}`}
      >
        {hero.announcement && (
          <motion.div {...createFadeInVariant(0)}>
            <Link
              href={hero.announcement.url || ''}
              target={hero.announcement.target || '_self'}
              className="bg-muted hover:bg-background group shadow-foreground/5 mx-auto mb-8 flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md transition-colors duration-300 rtl:flex-row-reverse rtl:pr-4 rtl:pl-1"
            >
              <span className="text-foreground text-sm">
                {hero.announcement.title}
              </span>
              <span className="bg-border/80 block h-4 w-px"></span>

              <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0 rtl:flex-row-reverse">
                  <span className="flex size-6">
                    <ArrowRight className="m-auto size-3 rtl:rotate-180" />
                  </span>
                  <span className="flex size-6">
                    <ArrowRight className="m-auto size-3 rtl:rotate-180" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <motion.div {...createFadeInVariant(0.15)}>
            {texts && texts.length > 0 ? (
              <h1
                className={cn(
                  publicPageTypography.heroTitle,
                  'text-foreground font-semibold text-balance sm:mt-12'
                )}
              >
                {texts[0]}
                <Highlighter action="underline">{highlightText}</Highlighter>
                {texts[1]}
              </h1>
            ) : (
              <h1
                className={cn(
                  publicPageTypography.heroTitle,
                  'text-foreground font-semibold text-balance sm:mt-12'
                )}
              >
                {hero.title}
              </h1>
            )}
          </motion.div>

          <motion.p
            {...createFadeInVariant(0.3)}
            className="text-muted-foreground mt-8 mb-8 text-lg text-balance"
            dangerouslySetInnerHTML={{ __html: hero.description ?? '' }}
          />

          {hero.buttons && (
            <motion.div
              {...createFadeInVariant(0.45)}
              className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
            >
              {hero.buttons.map((button, idx) => (
                <Button
                  asChild
                  size={button.size || 'default'}
                  variant={button.variant || 'default'}
                  className="w-full px-6 text-sm sm:w-auto"
                  key={idx}
                >
                  <Link
                    href={button.url ?? ''}
                    target={button.target ?? '_self'}
                    onClick={(e) => handleSmoothScroll(e, button.url ?? '')}
                  >
                    {button.icon && <SmartIcon name={button.icon as string} />}
                    <span>{button.title}</span>
                  </Link>
                </Button>
              ))}
            </motion.div>
          )}

          {hero.tip && (
            <motion.p
              {...createFadeInVariant(0.6)}
              className="text-muted-foreground mt-6 block text-center text-sm"
              dangerouslySetInnerHTML={{ __html: hero.tip ?? '' }}
            />
          )}

          {hero.show_avatars && (
            <motion.div {...createFadeInVariant(0.75)}>
              <SocialAvatars tip={hero.avatars_tip || ''} />
            </motion.div>
          )}
        </div>
      </section>

      <AnimatedGridPattern
        patternId="default-hero-grid"
        numSquares={30}
        maxOpacity={0.1}
        duration={3}
        className={cn(
          '[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]',
          'inset-x-0 inset-y-[-30%] h-[200%] skew-y-12'
        )}
      />
    </>
  );
}
