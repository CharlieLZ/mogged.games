'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';

import { PaymentModal } from '@/shared/blocks/payment/payment-modal';
import { StripeEmbeddedCheckoutModal } from '@/shared/blocks/payment/stripe-embedded-checkout-modal';
import { usePricingCheckout } from '@/shared/blocks/payment/use-pricing-checkout';
import {
  getPricingGridColumnsClass,
  PricingPlanCard,
} from '@/shared/blocks/pricing/pricing-plan-card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { getInitialPricingCurrency } from '@/shared/lib/pricing';
import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';
import type { Subscription } from '@/shared/models/subscription';
import {
  PricingItem,
  PricingPageCopy,
  Pricing as PricingType,
} from '@/shared/types/blocks/pricing';

export function Pricing({
  pricing,
  pageCopy,
  className,
  currentSubscription,
}: {
  pricing: PricingType;
  pageCopy: PricingPageCopy;
  className?: string;
  currentSubscription?: Subscription;
}) {
  const locale = useLocale();
  const {
    checkoutWithProvider,
    closeEmbeddedCheckout,
    embeddedCheckoutSession,
    finalizeEmbeddedCheckout,
    isEmbeddedCheckoutFinalizing,
    isEmbeddedCheckoutOpen,
    isLoading,
    pricingItem,
    productId,
    startCheckoutFlow,
    stripePublishableKey,
  } = usePricingCheckout({ locale });

  const [group, setGroup] = useState(() => {
    const currentItem = pricing.items?.find(
      (i) => i.product_id === currentSubscription?.productId
    );
    const featuredGroup = pricing.groups?.find((g) => g.is_featured);
    return (
      currentItem?.group || featuredGroup?.name || pricing.groups?.[0]?.name
    );
  });
  const [selectedCurrencies, setSelectedCurrencies] = useState<
    Record<string, string>
  >({});

  const handleCurrencyChange = (productId: string, currency: string) => {
    setSelectedCurrencies((prev) => ({
      ...prev,
      [productId]: currency,
    }));
  };

  const visibleItems =
    pricing.items?.filter((item) => !item.group || item.group === group) || [];

  return (
    <section
      id={pricing.id}
      className={cn(
        'pt-[var(--landing-page-top-space-mobile)] pb-12 md:pt-[var(--landing-page-top-space)] md:pb-16',
        pricing.className,
        className
      )}
    >
      <div className="mx-auto mb-6 px-4 text-center md:mb-8 md:px-8">
        <h1
          className={cn(
            'mb-2 font-bold text-pretty',
            publicPageTypography.sectionHeading
          )}
        >
          {pricing.title}
        </h1>
        <p
          className={cn(
            'text-muted-foreground mx-auto max-w-xl lg:max-w-none',
            publicPageTypography.cardDescription
          )}
        >
          {pricing.description}
        </p>
      </div>

      <div className="container">
        {pricing.groups && pricing.groups.length > 0 && (
          <div className="mx-auto mt-4 mb-8 flex w-full justify-center md:mt-5 md:mb-10 md:max-w-lg">
            <Tabs value={group} onValueChange={setGroup}>
              <TabsList>
                {pricing.groups.map((item, i) => {
                  return (
                    <TabsTrigger key={i} value={item.name || ''}>
                      {item.title}
                      {item.label && (
                        <Badge className="ml-2 rtl:mr-2 rtl:ml-0">
                          {item.label}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
        )}

        <div
          className={cn(
            'mt-0 grid w-full gap-6',
            getPricingGridColumnsClass(visibleItems.length)
          )}
        >
          {visibleItems.map((item: PricingItem) => {
            const isCurrentPlan =
              !!currentSubscription &&
              currentSubscription.productId === item.product_id;

            const selectedCurrency =
              selectedCurrencies[item.product_id] ||
              getInitialPricingCurrency(item, locale);

            return (
              <PricingPlanCard
                key={item.product_id}
                isCurrentPlan={isCurrentPlan}
                isLoading={isLoading}
                item={item}
                loadingProductId={productId}
                locale={locale}
                onCurrencyChange={handleCurrencyChange}
                onSelectPlan={startCheckoutFlow}
                pageCopy={pageCopy}
                selectedCurrency={selectedCurrency}
              />
            );
          })}
        </div>
      </div>

      <PaymentModal
        isLoading={isLoading}
        pricingItem={pricingItem}
        onCheckout={checkoutWithProvider}
      />
      {embeddedCheckoutSession ? (
        <StripeEmbeddedCheckoutModal
          clientSecret={embeddedCheckoutSession.clientSecret}
          isFinalizing={isEmbeddedCheckoutFinalizing}
          onComplete={finalizeEmbeddedCheckout}
          onOpenChange={(open) => {
            if (!open) {
              closeEmbeddedCheckout();
            }
          }}
          open={isEmbeddedCheckoutOpen}
          publishableKey={stripePublishableKey}
        />
      ) : null}
    </section>
  );
}
