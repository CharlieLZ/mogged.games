'use client';

import { Check, Loader2 } from 'lucide-react';

import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  getPricingItemCurrencies,
  resolvePricingItemCurrency,
} from '@/shared/lib/pricing';
import {
  buildPricingSnapshotCreditsValue,
  formatPricingMetricNumber,
  getPricingGenerationSpeedLabel,
  getPricingSnapshotMetrics,
} from '@/shared/lib/pricing-plan-metrics';
import { cn } from '@/shared/lib/utils';
import type {
  PricingItem,
  PricingPageCopy,
} from '@/shared/types/blocks/pricing';

export type PricingPlanCardPageCopy = Pick<
  PricingPageCopy,
  | 'current_plan'
  | 'currency_selector'
  | 'processing'
  | 'snapshot_title'
  | 'snapshot_credits'
  | 'snapshot_credits_total_suffix'
  | 'snapshot_credits_monthly_suffix'
  | 'snapshot_generation_speed'
  | 'snapshot_text_to_image'
  | 'snapshot_image_edit'
  | 'snapshot_credit_cost'
  | 'speed_standard'
  | 'speed_priority'
  | 'speed_fastest'
>;

export type PricingPlanCardDensity = 'default' | 'compact';

export function getPricingGridColumnsClass(columnCount: number) {
  switch (Math.max(1, Math.min(columnCount, 4))) {
    case 1:
      return 'md:grid-cols-1';
    case 2:
      return 'md:grid-cols-2';
    case 3:
      return 'md:grid-cols-3';
    default:
      return 'md:grid-cols-4';
  }
}

export function formatPricingPlanCopy(
  template: string,
  values?: Record<string, string | number>
) {
  return template.replace(/\{(.*?)\}/g, (_match, token) => {
    const value = values?.[String(token).trim()];
    return value === undefined ? `{${token}}` : String(value);
  });
}

export function PricingPlanCard({
  density = 'default',
  isCurrentPlan = false,
  isLoading = false,
  item,
  loadingProductId,
  locale,
  onCurrencyChange,
  onSelectPlan,
  pageCopy,
  selectedCurrency,
}: {
  density?: PricingPlanCardDensity;
  isCurrentPlan?: boolean;
  isLoading?: boolean;
  item: PricingItem;
  loadingProductId?: string | null;
  locale: string;
  onCurrencyChange?: (productId: string, currency: string) => void;
  onSelectPlan: (item: PricingItem) => void;
  pageCopy: PricingPlanCardPageCopy;
  selectedCurrency: string;
}) {
  const displayedItem = resolvePricingItemCurrency(item, selectedCurrency);
  const currencies = getPricingItemCurrencies(item);
  const generationSpeedLabel = getPricingGenerationSpeedLabel(
    displayedItem,
    pageCopy
  );
  const snapshotCreditsValue = buildPricingSnapshotCreditsValue({
    item: displayedItem,
    locale,
    pageCopy,
  });
  const snapshotMetrics = getPricingSnapshotMetrics({ pageCopy });
  const isCompact = density === 'compact';

  return (
    <Card
      data-slot="pricing-plan-card"
      data-featured={item.is_featured ? 'true' : 'false'}
      className={cn(
        'bg-card relative flex h-full flex-col overflow-hidden border transition-transform md:duration-200',
        isCompact ? 'gap-4 py-5' : null,
        item.is_featured
          ? cn(
              'border-primary/35 from-primary/8 via-background to-background ring-primary/15 shadow-primary/12 bg-linear-to-b shadow-lg ring-1',
              isCompact ? 'lg:-translate-y-1' : 'md:-translate-y-2'
            )
          : 'border-border/70 bg-card/96 shadow-sm'
      )}
    >
      {item.is_featured ? (
        <div
          aria-hidden="true"
          data-slot="pricing-featured-accent"
          className="via-primary/70 pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
        />
      ) : null}

      <CardHeader
        className={cn(
          'relative z-10 space-y-5 pb-5',
          isCompact ? 'space-y-3 px-4 pb-3' : null
        )}
      >
        <div className="flex items-start justify-between gap-3">
          {item.label ? (
            <Badge
              variant="secondary"
              className={cn(
                'rounded-full border px-3 py-1 text-[0.68rem] font-semibold tracking-[0.22em] uppercase',
                isCompact ? 'px-2.5 py-0.5 text-[0.62rem]' : null,
                item.is_featured
                  ? 'border-primary/20 bg-primary/12 text-primary'
                  : 'border-border/70 bg-muted/60 text-muted-foreground'
              )}
            >
              {item.label}
            </Badge>
          ) : (
            <span />
          )}

          {currencies.length > 1 && onCurrencyChange ? (
            <Select
              value={selectedCurrency}
              onValueChange={(currency) =>
                onCurrencyChange(item.product_id, currency)
              }
            >
              <SelectTrigger
                aria-label={pageCopy.currency_selector}
                size="sm"
                className="border-border/70 bg-background/60 h-8 min-w-[70px] px-2 text-xs"
              >
                <SelectValue placeholder={pageCopy.currency_selector} />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem
                    key={currency.currency}
                    value={currency.currency}
                    className="text-xs"
                  >
                    {currency.currency.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className={cn('space-y-2', isCompact ? 'space-y-1.5' : null)}>
          <CardTitle
            className={cn(
              'text-xl font-semibold tracking-tight',
              isCompact ? 'text-lg' : null
            )}
          >
            {item.title}
          </CardTitle>
          {item.description ? (
            <CardDescription
              className={cn(
                'text-sm leading-6',
                isCompact ? 'text-xs leading-5' : null
              )}
            >
              {item.description}
            </CardDescription>
          ) : null}
        </div>

        <div className={cn('space-y-2', isCompact ? 'space-y-1.5' : null)}>
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            <span
              className={cn(
                'text-primary text-3xl font-semibold tracking-tight',
                isCompact ? 'text-2xl' : null
              )}
            >
              {displayedItem.price}
            </span>
            {displayedItem.unit ? (
              <span className="text-muted-foreground pb-1 text-sm font-medium">
                {displayedItem.unit}
              </span>
            ) : null}
          </div>
          {displayedItem.original_price ? (
            <p className="text-muted-foreground text-sm line-through">
              {displayedItem.original_price}
            </p>
          ) : null}
          {item.tip ? (
            <p
              className={cn(
                'text-muted-foreground text-sm leading-6',
                isCompact ? 'text-xs leading-5' : null
              )}
            >
              {item.tip}
            </p>
          ) : null}
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          'relative z-10 flex flex-1 flex-col gap-5 pt-0',
          isCompact ? 'gap-4 px-4' : null
        )}
      >
        {isCurrentPlan ? (
          <Button
            variant="outline"
            className={cn('h-10 w-full rounded-xl', isCompact ? 'h-9' : null)}
            disabled
          >
            {pageCopy.current_plan}
          </Button>
        ) : (
          <Button
            onClick={() => onSelectPlan(displayedItem)}
            disabled={isLoading}
            className={cn(
              'h-10 w-full rounded-xl border text-sm font-medium shadow-sm',
              isCompact ? 'h-9' : null,
              item.is_featured
                ? 'bg-primary text-primary-foreground border-primary/30 shadow-primary/20 hover:bg-primary/90 hover:shadow-md'
                : 'bg-background/60 text-foreground border-border hover:bg-muted/50'
            )}
          >
            {isLoading && loadingProductId === item.product_id ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{pageCopy.processing}</span>
              </>
            ) : (
              <>
                {item.button?.icon ? (
                  <SmartIcon
                    name={item.button.icon as string}
                    className="size-4"
                  />
                ) : null}
                <span>{item.button?.title}</span>
              </>
            )}
          </Button>
        )}

        <div className="space-y-3">
          {item.features_title ? (
            <p className="text-sm font-medium">{item.features_title}</p>
          ) : null}
          <ul
            className={cn('space-y-3 text-sm', isCompact ? 'space-y-2' : null)}
          >
            {item.features?.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-3" />
                </span>
                <span
                  className={cn(
                    'text-muted-foreground leading-6',
                    isCompact ? 'leading-5' : null
                  )}
                >
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={cn(
            'border-border/70 bg-background/40 mt-auto rounded-2xl border p-4',
            isCompact ? 'rounded-xl p-3' : null
          )}
          data-testid="pricing-snapshot"
        >
          <p className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.22em] uppercase">
            {pageCopy.snapshot_title}
          </p>
          <dl
            className={cn(
              'mt-4 space-y-3 text-sm',
              isCompact ? 'mt-3 space-y-2 text-xs' : null
            )}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1">
              <dt className="text-muted-foreground min-w-0">
                {pageCopy.snapshot_credits}
              </dt>
              <dd className="text-foreground text-right font-semibold rtl:text-left">
                {snapshotCreditsValue}
              </dd>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1">
              <dt className="text-muted-foreground min-w-0">
                {pageCopy.snapshot_generation_speed}
              </dt>
              <dd className="text-foreground text-right font-semibold rtl:text-left">
                {generationSpeedLabel}
              </dd>
            </div>
            {snapshotMetrics.map((metric) => (
              <div
                key={metric.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1"
              >
                <dt className="text-muted-foreground min-w-0">
                  {metric.label}
                </dt>
                <dd className="text-foreground text-right font-semibold rtl:text-left">
                  {formatPricingPlanCopy(pageCopy.snapshot_credit_cost, {
                    credits: formatPricingMetricNumber(locale, metric.credits),
                  })}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
