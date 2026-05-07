'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import type { GeneratorPricingPayload } from '@/shared/blocks/generator/generator-pricing-payload';
import {
  getPricingGridColumnsClass,
  PricingPlanCard,
} from '@/shared/blocks/pricing/pricing-plan-card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { getInitialPricingCurrency } from '@/shared/lib/pricing';
import { cn } from '@/shared/lib/utils';
import type { PricingItem } from '@/shared/types/blocks/pricing';

type GeneratorPricingModalProps = {
  costCredits: number;
  isLoading: boolean;
  loadingProductId: string | null;
  onCheckout: (item: PricingItem) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pricingPayload: GeneratorPricingPayload;
  translationNamespace?: 'ai.video.generator' | 'ai.image.generator';
};

type GeneratorPricingModalBodyProps = Omit<
  GeneratorPricingModalProps,
  'open'
> & {
  isDesktopLayout?: boolean;
};

function GeneratorPricingModalBody({
  costCredits,
  isDesktopLayout = false,
  isLoading,
  loadingProductId,
  onCheckout,
  onOpenChange,
  pricingPayload,
  translationNamespace = 'ai.image.generator',
}: GeneratorPricingModalBodyProps) {
  const t = useTranslations(translationNamespace);
  const locale = useLocale();
  const { pricing, pageCopy } = pricingPayload;
  const [group, setGroup] = useState(() => {
    const featuredGroup = pricing.groups?.find((item) => item.is_featured);
    return featuredGroup?.name || pricing.groups?.[0]?.name || '';
  });
  const [selectedCurrencies, setSelectedCurrencies] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const featuredGroup = pricing.groups?.find((item) => item.is_featured);
    setGroup(featuredGroup?.name || pricing.groups?.[0]?.name || '');
  }, [pricing.groups]);

  const visibleItems =
    pricing.items?.filter((item) => !item.group || item.group === group) ||
    pricing.items ||
    [];

  const handleCurrencyChange = (productId: string, currency: string) => {
    setSelectedCurrencies((prev) => ({
      ...prev,
      [productId]: currency,
    }));
  };
  const hasGroups = Boolean(pricing.groups?.length);

  return (
    <div data-slot="generator-pricing-modal" className="space-y-4">
      <div
        data-slot="generator-pricing-modal-cost"
        className={cn(
          'bg-primary/8 text-primary inline-flex min-h-10 items-center rounded-full border border-current/15 px-4 text-sm font-semibold',
          isDesktopLayout ? 'mx-auto justify-center' : 'justify-start'
        )}
      >
        {t('credits_cost', { credits: costCredits })}
      </div>
      {hasGroups ? (
        <div
          data-slot="generator-pricing-modal-controls"
          className={cn(
            'flex flex-wrap items-center gap-3',
            isDesktopLayout ? 'justify-center' : 'justify-start'
          )}
        >
          <Tabs value={group} onValueChange={setGroup}>
            <TabsList className="h-9">
              {pricing.groups?.map((item) => (
                <TabsTrigger
                  key={item.name}
                  value={item.name || ''}
                  className="h-7 px-2.5 text-xs"
                >
                  {item.title}
                  {item.label ? (
                    <Badge className="ml-2 rtl:mr-2 rtl:ml-0">
                      {item.label}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      ) : null}

      {visibleItems.length > 0 ? (
        <div
          className={cn(
            'grid w-full gap-4',
            getPricingGridColumnsClass(visibleItems.length)
          )}
        >
          {visibleItems.map((item) => {
            const selectedCurrency =
              selectedCurrencies[item.product_id] ||
              getInitialPricingCurrency(item, locale);

            return (
              <PricingPlanCard
                key={item.product_id}
                density="compact"
                isLoading={isLoading}
                item={item}
                loadingProductId={loadingProductId}
                locale={locale}
                onCurrencyChange={handleCurrencyChange}
                onSelectPlan={(selectedItem) => {
                  onOpenChange(false);
                  onCheckout(selectedItem);
                }}
                pageCopy={pageCopy}
                selectedCurrency={selectedCurrency}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function GeneratorPricingModal({
  open,
  onOpenChange,
  ...props
}: GeneratorPricingModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const tc = useTranslations('common.sign');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:max-w-[1040px] sm:p-5">
          <DialogHeader className="items-center px-8 text-center sm:text-center rtl:sm:text-center">
            <DialogTitle className="text-xl">
              {props.pricingPayload.pricing.title}
            </DialogTitle>
            <DialogDescription className="max-w-3xl">
              {props.pricingPayload.pricing.description}
            </DialogDescription>
          </DialogHeader>
          <GeneratorPricingModalBody
            {...props}
            isDesktopLayout
            onOpenChange={onOpenChange}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88dvh]">
        <DrawerHeader className="text-left rtl:text-right">
          <DrawerTitle>{props.pricingPayload.pricing.title}</DrawerTitle>
          <DrawerDescription>
            {props.pricingPayload.pricing.description}
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-2">
          <GeneratorPricingModalBody {...props} onOpenChange={onOpenChange} />
        </div>
        <DrawerFooter className="pt-4">
          <DrawerClose asChild>
            <Button variant="outline">{tc('cancel_title')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
