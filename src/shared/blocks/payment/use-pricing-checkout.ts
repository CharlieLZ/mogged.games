'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAppContext } from '@/shared/contexts/app';
import { getCookie } from '@/shared/lib/cookie';
import {
  convertMinorUnitsToGoogleAdsValue,
  resolveGoogleAdsConfigs,
  trackGoogleAdsConversion,
} from '@/shared/lib/google-ads';
import type { PricingItem } from '@/shared/types/blocks/pricing';

type CheckoutResponseData = {
  checkoutUrl?: string;
  clientSecret?: string;
  flow?: 'redirect' | 'embedded';
  orderNo?: string;
  paymentCallbackUrl?: string;
  paymentResultUrl?: string;
  provider?: string;
  sessionId?: string;
};

type EmbeddedCheckoutSession = {
  clientSecret: string;
  orderNo: string;
  paymentCallbackUrl: string;
  paymentResultUrl: string;
};

const EMPTY_CHECKOUT_CONFIGS: Record<string, string> = {};
const EMBEDDED_CHECKOUT_STORAGE_KEY = 'imageeditorai:stripe-embedded-checkout';
const EMBEDDED_CHECKOUT_RESUME_PARAM = 'stripe_checkout_resume';
const noop = () => undefined;

function getAffiliateMetadata({
  configs,
  paymentProvider,
}: {
  configs: Record<string, string>;
  paymentProvider: string;
}) {
  const affiliateMetadata: Record<string, string> = {};

  if (
    configs.affonso_enabled === 'true' &&
    ['stripe', 'creem'].includes(paymentProvider)
  ) {
    affiliateMetadata.affonso_referral = getCookie('affonso_referral') || '';
  }

  if (
    configs.promotekit_enabled === 'true' &&
    ['stripe'].includes(paymentProvider)
  ) {
    affiliateMetadata.promotekit_referral =
      typeof window !== 'undefined' &&
      (window as { promotekit_referral?: string }).promotekit_referral
        ? (window as { promotekit_referral?: string }).promotekit_referral || ''
        : getCookie('promotekit_referral') || '';
  }

  return affiliateMetadata;
}

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function persistEmbeddedCheckoutSession(session: EmbeddedCheckoutSession) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    EMBEDDED_CHECKOUT_STORAGE_KEY,
    JSON.stringify(session)
  );
}

function clearEmbeddedCheckoutSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(EMBEDDED_CHECKOUT_STORAGE_KEY);
}

function readEmbeddedCheckoutSession(): EmbeddedCheckoutSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(EMBEDDED_CHECKOUT_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<EmbeddedCheckoutSession>;
    if (
      typeof parsed.clientSecret !== 'string' ||
      !parsed.clientSecret.trim() ||
      typeof parsed.orderNo !== 'string' ||
      !parsed.orderNo.trim() ||
      typeof parsed.paymentCallbackUrl !== 'string' ||
      !parsed.paymentCallbackUrl.trim() ||
      typeof parsed.paymentResultUrl !== 'string' ||
      !parsed.paymentResultUrl.trim()
    ) {
      return null;
    }

    return {
      clientSecret: parsed.clientSecret,
      orderNo: parsed.orderNo,
      paymentCallbackUrl: parsed.paymentCallbackUrl,
      paymentResultUrl: parsed.paymentResultUrl,
    };
  } catch {
    return null;
  }
}

export function usePricingCheckout({ locale }: { locale: string }) {
  const appContext = useAppContext();
  const user = appContext.user ?? null;
  const setIsShowPaymentModal = appContext.setIsShowPaymentModal ?? noop;
  const setIsShowSignModal = appContext.setIsShowSignModal ?? noop;
  const configs = appContext.configs ?? EMPTY_CHECKOUT_CONFIGS;
  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [pricingItem, setPricingItem] = useState<PricingItem | null>(null);
  const [embeddedCheckoutSession, setEmbeddedCheckoutSession] =
    useState<EmbeddedCheckoutSession | null>(null);
  const [isEmbeddedCheckoutFinalizing, setIsEmbeddedCheckoutFinalizing] =
    useState(false);

  const closeEmbeddedCheckout = useCallback(() => {
    if (isEmbeddedCheckoutFinalizing) {
      return;
    }

    clearEmbeddedCheckoutSession();
    setEmbeddedCheckoutSession(null);
  }, [isEmbeddedCheckoutFinalizing]);

  useEffect(() => {
    if (embeddedCheckoutSession || isEmbeddedCheckoutFinalizing) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
      window.location.origin
    );
    if (currentUrl.searchParams.get(EMBEDDED_CHECKOUT_RESUME_PARAM) !== '1') {
      return;
    }

    const orderNo = currentUrl.searchParams.get('order_no')?.trim();
    if (!orderNo) {
      return;
    }

    const storedSession = readEmbeddedCheckoutSession();
    if (!storedSession || storedSession.orderNo !== orderNo) {
      return;
    }

    setIsShowPaymentModal(false);
    setEmbeddedCheckoutSession(storedSession);

    currentUrl.searchParams.delete(EMBEDDED_CHECKOUT_RESUME_PARAM);
    currentUrl.searchParams.delete('order_no');
    const nextUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    window.history.replaceState(
      window.history.state,
      '',
      nextUrl || '/pricing'
    );
  }, [
    embeddedCheckoutSession,
    isEmbeddedCheckoutFinalizing,
    setIsShowPaymentModal,
  ]);

  const finalizeEmbeddedCheckout = useCallback(async () => {
    if (!embeddedCheckoutSession) {
      return;
    }

    setIsEmbeddedCheckoutFinalizing(true);
    let isPaid = false;

    try {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const response = await fetch(
            `/api/payment/check-status?order_no=${encodeURIComponent(embeddedCheckoutSession.orderNo)}`,
            {
              method: 'GET',
              cache: 'no-store',
            }
          );

          if (response.ok) {
            const payload = await response.json();
            const paymentStatus =
              typeof payload?.data?.paymentStatus === 'string'
                ? payload.data.paymentStatus
                : '';
            const orderStatus =
              typeof payload?.data?.status === 'string'
                ? payload.data.status
                : '';

            if (
              payload?.code === 0 &&
              (paymentStatus === 'paid' || orderStatus === 'paid')
            ) {
              isPaid = true;
              break;
            }
          }
        } catch (error) {
          console.error('[payment][stripe-embedded] status refresh failed', {
            orderNo: embeddedCheckoutSession.orderNo,
            step: `attempt_${attempt + 1}`,
            error,
          });
        }

        if (attempt < 3) {
          await sleep(400 * (attempt + 1));
        }
      }
    } finally {
      const paymentResultUrl = embeddedCheckoutSession.paymentResultUrl;
      const paymentCallbackUrl = embeddedCheckoutSession.paymentCallbackUrl;
      setIsEmbeddedCheckoutFinalizing(false);
      setEmbeddedCheckoutSession(null);
      clearEmbeddedCheckoutSession();

      const nextUrl = isPaid ? paymentResultUrl : paymentCallbackUrl;
      if (nextUrl) {
        window.location.assign(nextUrl);
      }
    }
  }, [embeddedCheckoutSession]);

  const checkoutWithProvider = useCallback(
    async (
      item: PricingItem,
      paymentProvider?: string,
      metadataProvider?: string
    ) => {
      try {
        if (!user) {
          setIsShowSignModal(true);
          return;
        }

        const resolvedProvider = paymentProvider || '';
        const params = {
          product_id: item.product_id,
          currency: item.currency,
          locale: locale || 'en',
          payment_provider: resolvedProvider,
          metadata: getAffiliateMetadata({
            configs,
            paymentProvider: metadataProvider || resolvedProvider,
          }),
        };

        setIsLoading(true);
        setProductId(item.product_id);

        const response = await fetch('/api/payment/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });

        if (response.status === 401) {
          setIsLoading(false);
          setProductId(null);
          setPricingItem(null);
          setIsShowSignModal(true);
          return;
        }

        if (!response.ok) {
          throw new Error(`request failed with status ${response.status}`);
        }

        const { code, data, message } = await response.json();
        if (code !== 0) {
          throw new Error(message);
        }

        const checkoutData = (data || {}) as CheckoutResponseData;
        const checkoutUrl =
          typeof checkoutData.checkoutUrl === 'string'
            ? checkoutData.checkoutUrl
            : '';
        const checkoutFlow =
          checkoutData.flow === 'embedded' ? 'embedded' : 'redirect';
        const clientSecret =
          typeof checkoutData.clientSecret === 'string'
            ? checkoutData.clientSecret
            : '';
        const orderNo =
          typeof checkoutData.orderNo === 'string' ? checkoutData.orderNo : '';
        const paymentResultUrl =
          typeof checkoutData.paymentResultUrl === 'string'
            ? checkoutData.paymentResultUrl
            : '';
        const paymentCallbackUrl =
          typeof checkoutData.paymentCallbackUrl === 'string'
            ? checkoutData.paymentCallbackUrl
            : '';

        const googleAdsConfigs = resolveGoogleAdsConfigs(configs);
        if (
          googleAdsConfigs.enabled &&
          googleAdsConfigs.conversionId &&
          googleAdsConfigs.beginCheckoutLabel
        ) {
          trackGoogleAdsConversion({
            conversionId: googleAdsConfigs.conversionId,
            label: googleAdsConfigs.beginCheckoutLabel,
            value: convertMinorUnitsToGoogleAdsValue(
              item.amount,
              item.currency
            ),
            currency: (item.currency || 'USD').toUpperCase(),
          });
        }

        if (checkoutFlow === 'embedded') {
          if (!clientSecret) {
            throw new Error('embedded checkout client secret not found');
          }

          if (!orderNo) {
            throw new Error('embedded checkout order no not found');
          }

          if (!paymentResultUrl) {
            throw new Error('embedded checkout result url not found');
          }

          if (!paymentCallbackUrl) {
            throw new Error('embedded checkout callback url not found');
          }

          setIsLoading(false);
          setProductId(null);
          setIsShowPaymentModal(false);
          const session = {
            clientSecret,
            orderNo,
            paymentCallbackUrl,
            paymentResultUrl,
          };
          persistEmbeddedCheckoutSession(session);
          setEmbeddedCheckoutSession(session);
          return;
        }

        if (!checkoutUrl) {
          throw new Error('checkout url not found');
        }

        setIsLoading(false);
        setProductId(null);
        setIsShowPaymentModal(false);
        window.location.assign(checkoutUrl);
      } catch (error) {
        console.error('checkout failed:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'checkout failed';
        toast.error(`checkout failed: ${errorMessage}`);

        setIsLoading(false);
        setProductId(null);
      }
    },
    [configs, locale, setIsShowPaymentModal, setIsShowSignModal, user]
  );

  const startCheckoutFlow = useCallback(
    (item: PricingItem) => {
      if (!user) {
        setIsShowSignModal(true);
        return;
      }

      if (configs.select_payment_enabled === 'true') {
        setPricingItem(item);
        setIsShowPaymentModal(true);
        return;
      }

      void checkoutWithProvider(
        item,
        undefined,
        configs.default_payment_provider
      );
    },
    [
      checkoutWithProvider,
      configs.default_payment_provider,
      configs.select_payment_enabled,
      setIsShowPaymentModal,
      setIsShowSignModal,
      user,
    ]
  );

  return {
    isLoading,
    isEmbeddedCheckoutFinalizing,
    isEmbeddedCheckoutOpen: embeddedCheckoutSession !== null,
    embeddedCheckoutSession,
    pricingItem,
    productId,
    stripePublishableKey: configs.stripe_publishable_key || '',
    closeEmbeddedCheckout,
    checkoutWithProvider,
    finalizeEmbeddedCheckout,
    setPricingItem,
    startCheckoutFlow,
  };
}
