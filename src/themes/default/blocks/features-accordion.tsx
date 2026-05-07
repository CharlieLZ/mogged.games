'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';

import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { BorderBeam } from '@/shared/components/magicui/border-beam';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';
import { Features as FeaturesType } from '@/shared/types/blocks/landing';

export function FeaturesAccordion({
  features,
  className,
}: {
  features: FeaturesType;
  className?: string;
}) {
  const [activeItem, setActiveItem] = useState<string>('item-1');

  const images: any = {};
  features.items?.forEach((item, idx) => {
    images[`item-${idx + 1}`] = {
      image: item.image?.src ?? '',
      alt: item.image?.alt || item.title || '',
    };
  });

  return (
    // overflow-x-hidden to prevent horizontal scroll
    <section className={`overflow-x-hidden py-16 md:py-24 ${className}`}>
      <div className="absolute inset-0 -z-10 bg-linear-to-b sm:inset-6 sm:rounded-b-3xl dark:block dark:to-[color-mix(in_oklab,var(--color-card)_75%,var(--color-background))]"></div>
      {/* add overflow-x-hidden to container */}
      <div className="container space-y-8 overflow-x-hidden px-2 sm:px-6 md:space-y-16 lg:space-y-20 dark:[--color-border:color-mix(in_oklab,var(--color-white)_10%,transparent)]">
        <ScrollAnimation>
          <div className="mx-auto max-w-4xl text-center text-balance">
            <h2
              className={cn(
                'text-foreground mb-4',
                publicPageTypography.sectionHeading
              )}
            >
              {features.title}
            </h2>
            <p
              className={cn(
                'text-muted-foreground mb-6 md:mb-12 lg:mb-16',
                publicPageTypography.cardDescription
              )}
            >
              {features.description}
            </p>
          </div>
        </ScrollAnimation>

        {/* grid: clamp min-w-0 and fix px padding/breakpoints */}
        <div className="grid min-w-0 gap-12 sm:px-6 md:grid-cols-2 lg:gap-20 lg:px-0">
          <ScrollAnimation delay={0.1} direction="left">
            <Accordion
              type="single"
              value={activeItem}
              onValueChange={(value) => setActiveItem(value as string)}
              className="w-full"
            >
              {features.items?.map((item, idx) => (
                <AccordionItem value={`item-${idx + 1}`} key={idx}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2 text-base">
                      {item.icon && (
                        <SmartIcon name={item.icon as string} size={24} />
                      )}
                      {item.title}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>{item.description}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollAnimation>

          <ScrollAnimation delay={0.2} direction="right">
            {/* min-w-0/flex-shrink to prevent overflow */}
            <div className="bg-background relative flex min-w-0 flex-shrink overflow-hidden rounded-3xl border p-2">
              <div className="absolute inset-0 right-0 ml-auto w-15 border-l bg-[repeating-linear-gradient(-45deg,var(--color-border),var(--color-border)_1px,transparent_1px,transparent_8px)] rtl:right-auto rtl:left-0 rtl:mr-auto rtl:ml-0 rtl:border-r rtl:border-l-0"></div>
              <div className="bg-background relative aspect-76/59 w-full min-w-0 rounded-2xl sm:w-[calc(3/4*100%+3rem)]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeItem}-id`}
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="bg-card shadow-foreground/10 size-full overflow-hidden rounded-2xl border shadow-md"
                  >
                    <Image
                      src={images[activeItem].image}
                      className="size-full object-cover object-left-top rtl:object-right-top dark:mix-blend-lighten"
                      alt={images[activeItem].alt}
                      width={1207}
                      height={929}
                      // prevent img from exceeding parent
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
              <BorderBeam
                duration={6}
                size={200}
                className="via-primary/60 dark:via-accent/60 from-transparent to-transparent"
              />
            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
}
