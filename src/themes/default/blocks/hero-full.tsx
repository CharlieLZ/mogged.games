'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface BenefitData {
  label: string;
  value: string;
}

interface Benefits {
  title: string;
  data: BenefitData[];
}

interface HeroFullProps {
  title: string;
  subtitle: string;
  features?: Feature[];
  benefits?: Benefits;
  primaryCTA: string;
  primaryLink: string;
  secondaryCTA?: string;
  secondaryLink?: string;
  tertiaryCTA?: string;
  tertiaryLink?: string;
  className?: string;
}

// 动画变体
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/**
 * HeroFull - 博客文章结尾 CTA 组件
 * 用于博客文章结尾，提供详细的转化选项和功能展示
 */
export function HeroFull({
  title,
  subtitle,
  features = [],
  benefits,
  primaryCTA,
  primaryLink,
  secondaryCTA,
  secondaryLink,
  tertiaryCTA,
  tertiaryLink,
  className,
}: HeroFullProps) {
  return (
    <motion.section
      initial="initial"
      animate="animate"
      className={cn(
        'border-border/70 from-primary/10 via-accent/10 to-secondary/10 shadow-foreground/10 dark:from-primary/20 dark:via-accent/15 dark:to-secondary/15 my-12 rounded-3xl border bg-gradient-to-br p-8 shadow-2xl md:p-12 lg:p-16',
        className
      )}
    >
      <div className="mx-auto max-w-6xl">
        {/* 标题区域 */}
        <motion.div {...fadeInUp} className="mb-12 text-center">
          <h2
            className={cn(
              'text-foreground mb-4 font-bold',
              publicPageTypography.sectionHeading
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              'text-muted-foreground mx-auto max-w-3xl',
              publicPageTypography.cardDescription
            )}
          >
            {subtitle}
          </p>
        </motion.div>

        {/* 功能特性网格 */}
        {features && features.length > 0 && (
          <motion.div
            variants={staggerChildren}
            className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-card/90 border-border/70 hover:shadow-foreground/10 rounded-xl border p-6 transition-shadow hover:shadow-lg"
              >
                <div className="mb-3 text-3xl">{feature.icon}</div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* 优势数据展示 */}
        {benefits && benefits.data && benefits.data.length > 0 && (
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.3 }}
            className="bg-card/90 border-border/70 mb-12 rounded-2xl border p-8"
          >
            <h3 className="text-foreground mb-6 text-center text-2xl font-bold">
              {benefits.title}
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {benefits.data.map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="mb-2 flex items-center justify-center">
                    <CheckCircle2 className="text-primary mr-2 h-5 w-5 rtl:mr-0 rtl:ml-2" />
                    <span className="text-muted-foreground text-sm font-medium">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-primary text-2xl font-bold">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA 按钮组 */}
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button
            asChild
            size="lg"
            className="shadow-primary/20 w-full px-8 py-6 text-lg shadow-lg sm:w-auto"
          >
            <Link href={primaryLink}>
              <span>{primaryCTA}</span>
              <ArrowRight className="ml-2 h-5 w-5 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
            </Link>
          </Button>

          {secondaryCTA && secondaryLink && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-border/80 hover:bg-muted/70 w-full px-8 py-6 text-lg sm:w-auto"
            >
              <Link href={secondaryLink}>
                <span>{secondaryCTA}</span>
              </Link>
            </Button>
          )}

          {tertiaryCTA && tertiaryLink && (
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="hover:bg-muted/70 w-full px-8 py-6 text-lg sm:w-auto"
            >
              <Link href={tertiaryLink}>
                <span>{tertiaryCTA}</span>
              </Link>
            </Button>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}
