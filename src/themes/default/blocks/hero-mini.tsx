'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface HeroMiniProps {
  title: string;
  subtitle: string;
  primaryCTA: string;
  primaryLink: string;
  secondaryCTA?: string;
  secondaryLink?: string;
  className?: string;
}

// 渐入动画变体
const fadeInVariant = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

/**
 * HeroMini - 博客文章开头 CTA 组件
 * 用于博客文章开头，提供快速行动入口
 */
export function HeroMini({
  title,
  subtitle,
  primaryCTA,
  primaryLink,
  secondaryCTA,
  secondaryLink,
  className,
}: HeroMiniProps) {
  return (
    <motion.section
      initial="initial"
      animate="animate"
      className={cn(
        'border-border/70 from-muted/70 via-primary/5 to-accent/10 dark:from-muted/60 dark:via-primary/10 dark:to-accent/15 my-8 rounded-2xl border bg-gradient-to-br p-8 md:p-10',
        className
      )}
    >
      <div className="mx-auto max-w-3xl text-center">
        <motion.h2
          {...fadeInVariant}
          className="text-foreground mb-3 text-2xl font-bold md:text-3xl"
        >
          {title}
        </motion.h2>

        <motion.p
          {...fadeInVariant}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-muted-foreground mb-6 text-base md:text-lg"
        >
          {subtitle}
        </motion.p>

        <motion.div
          {...fadeInVariant}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Button
            asChild
            size="lg"
            className="shadow-primary/20 w-full shadow-lg sm:w-auto"
          >
            <Link href={primaryLink}>
              <span>{primaryCTA}</span>
              <ArrowRight className="ml-2 h-4 w-4 rtl:ml-0 rtl:mr-2 rtl:rotate-180" />
            </Link>
          </Button>

          {secondaryCTA && secondaryLink && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-border/80 hover:bg-muted/70 w-full sm:w-auto"
            >
              <Link href={secondaryLink}>
                <span>{secondaryCTA}</span>
              </Link>
            </Button>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}
