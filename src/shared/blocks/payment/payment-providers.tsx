'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { PaymentProviderName } from '@/config/website/pricing-catalog';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import type { Button as ButtonType } from '@/shared/types/blocks/common';
import type { PricingItem } from '@/shared/types/blocks/pricing';

const PAYMENT_PROVIDER_OPTIONS: Array<{
  configKey: string;
  icon_url: string;
  name: PaymentProviderName;
  title: string;
}> = [
  {
    name: 'stripe',
    title: 'Stripe',
    icon_url: '/images/logos/stripe.png',
    configKey: 'stripe_enabled',
  },
  {
    name: 'creem',
    title: 'Creem',
    icon_url: '/images/logos/creem.png',
    configKey: 'creem_enabled',
  },
  {
    name: 'paypal',
    title: 'Paypal',
    icon_url: '/images/logos/paypal.svg',
    configKey: 'paypal_enabled',
  },
];

export function PaymentProviders({
  configs,
  loading,
  pricingItem,
  onCheckout,
  className,
}: {
  configs: Record<string, string>;
  loading: boolean;
  pricingItem: PricingItem | null;
  onCheckout: (item: PricingItem, paymentProvider?: string) => void;
  className?: string;
}) {
  const t = useTranslations('common.payment');

  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);

  const handlePayment = ({ provider }: { provider: string }) => {
    if (!provider) {
      toast.error(t('select_payment_method_error'));
      return;
    }
    if (!pricingItem) {
      toast.error(t('select_pricing_item_error'));
      return;
    }

    onCheckout(pricingItem, provider);
  };

  const allowedProviders = pricingItem?.payment_providers;

  const isProviderAllowed = (providerName: PaymentProviderName): boolean => {
    if (!allowedProviders || allowedProviders.length === 0) {
      return true;
    }

    return allowedProviders.includes(providerName);
  };

  const providers: ButtonType[] = PAYMENT_PROVIDER_OPTIONS.filter(
    (provider) =>
      configs[provider.configKey] === 'true' && isProviderAllowed(provider.name)
  ).map((provider) => ({
    name: provider.name,
    title: provider.title,
    icon_url: provider.icon_url,
    onClick: () => handlePayment({ provider: provider.name }),
  }));

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2',
        'flex-col justify-between',
        className
      )}
    >
      {providers.map((provider) => (
        <Button
          key={provider.name}
          variant="outline"
          className={cn('w-full gap-2')}
          disabled={loading}
          onClick={() => {
            if (!provider.onClick || !provider.name) {
              toast.error(t('invalid_payment_method_error'));
              return;
            }

            setPaymentProvider(provider.name);
            provider.onClick();
          }}
        >
          {provider.icon_url && (
            <Image
              src={provider.icon_url}
              alt={provider.title || provider.name || ''}
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <h3>{provider.title}</h3>
          {paymentProvider === provider.name && loading && (
            <Loader2 className="size-4 animate-spin" />
          )}
        </Button>
      ))}
    </div>
  );
}
