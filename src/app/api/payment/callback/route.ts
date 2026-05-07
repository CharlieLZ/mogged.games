import { redirect } from 'next/navigation';

import { PaymentStatus } from '@/extensions/payment/types';
import {
  convertMinorUnitsToGoogleAdsValue,
  resolveGoogleAdsConfigs,
} from '@/shared/lib/google-ads';
import {
  resolvePaymentPricingFallbackUrl,
  resolvePaymentResultUrl,
} from '@/shared/lib/payment-callback';
import { resolveRequestContext } from '@/shared/lib/request-context';
import { getAllConfigs } from '@/shared/models/config';
import { findOrderByOrderNo } from '@/shared/models/order';
import { syncGoogleAdsPurchaseConversionForOrder } from '@/shared/services/google-ads-purchase-sync';
import {
  getPaymentService,
  handleCheckoutSuccess,
} from '@/shared/services/payment';
import { recordPaymentCallbackEvent } from '@/shared/services/payment-observability';

function appendCallbackParams({
  targetUrl,
  orderNo,
  value,
  currency,
}: {
  targetUrl: string;
  orderNo: string;
  value?: number;
  currency?: string | null;
}) {
  const callbackTarget = new URL(targetUrl);
  callbackTarget.searchParams.set('order_no', orderNo);
  callbackTarget.searchParams.set('google_ads_purchase', '1');
  if (typeof value === 'number' && Number.isFinite(value)) {
    callbackTarget.searchParams.set('google_ads_value', String(value));
  }
  const normalizedCurrency = currency?.trim().toUpperCase();
  if (normalizedCurrency) {
    callbackTarget.searchParams.set('google_ads_currency', normalizedCurrency);
  }
  return callbackTarget.toString();
}

function appendStripeCheckoutResumeParams({
  targetUrl,
  orderNo,
}: {
  targetUrl: string;
  orderNo: string;
}) {
  const callbackTarget = new URL(targetUrl);
  callbackTarget.searchParams.set('stripe_checkout_resume', '1');
  callbackTarget.searchParams.set('order_no', orderNo);
  return callbackTarget.toString();
}

export async function GET(req: Request) {
  const googleAdsConfigs = resolveGoogleAdsConfigs(await getAllConfigs());
  const requestContext = resolveRequestContext(req.headers, {
    path: '/api/payment/callback',
  });
  let redirectUrl = resolvePaymentPricingFallbackUrl();
  let callbackEventContext: {
    userId: string;
    orderNo: string;
    provider?: string | null;
    paymentType?: string | null;
  } | null = null;
  let callbackOrderNo: string | null = null;

  try {
    const { searchParams } = new URL(req.url);
    const orderNo = searchParams.get('order_no')?.trim();
    const sessionId = searchParams.get('session_id')?.trim();
    callbackOrderNo = orderNo || null;

    if (!orderNo) {
      throw new Error('invalid callback params');
    }

    const order = await findOrderByOrderNo(orderNo);
    if (!order) {
      throw new Error('order not found');
    }

    if (
      sessionId &&
      order.paymentSessionId &&
      sessionId !== order.paymentSessionId
    ) {
      console.warn('[payment-callback] returned session does not match order', {
        orderNo,
        expectedSessionId: order.paymentSessionId,
        returnedSessionId: sessionId,
      });
    }

    const resultUrl = resolvePaymentResultUrl({
      callbackUrl: order.callbackUrl,
      paymentType: order.paymentType,
      locale: order.checkoutLocale,
    });
    redirectUrl =
      googleAdsConfigs.enabled &&
      googleAdsConfigs.purchaseTrackingMode === 'browser'
        ? appendCallbackParams({
            targetUrl: resultUrl,
            orderNo: order.orderNo,
            value: convertMinorUnitsToGoogleAdsValue(
              order.paymentAmount ?? order.amount,
              order.paymentCurrency ?? order.currency
            ),
            currency: order.paymentCurrency ?? order.currency,
          })
        : resultUrl;

    callbackEventContext = {
      userId: order.userId,
      orderNo,
      provider: order.paymentProvider,
      paymentType: order.paymentType,
    };

    await recordPaymentCallbackEvent({
      userId: order.userId,
      orderNo,
      provider: order.paymentProvider,
      paymentType: order.paymentType,
      requestContext,
      state: 'arrived',
    });

    if (!order.paymentSessionId || !order.paymentProvider) {
      await recordPaymentCallbackEvent({
        userId: order.userId,
        orderNo,
        provider: order.paymentProvider,
        paymentType: order.paymentType,
        requestContext,
        state: 'skipped',
        reason: 'payment session missing',
      });
    } else {
      const paymentService = await getPaymentService();
      const paymentProvider = paymentService.getProvider(order.paymentProvider);
      if (!paymentProvider) {
        await recordPaymentCallbackEvent({
          userId: order.userId,
          orderNo,
          provider: order.paymentProvider,
          paymentType: order.paymentType,
          requestContext,
          state: 'skipped',
          reason: 'payment provider not found',
        });
      } else {
        const session = await paymentProvider.getPaymentSession({
          sessionId: order.paymentSessionId,
        });

        await handleCheckoutSuccess({
          order,
          session,
        });

        const isStripeEmbeddedCallbackPending =
          order.paymentProvider === 'stripe' &&
          session.paymentStatus !== PaymentStatus.SUCCESS;

        if (
          !isStripeEmbeddedCallbackPending &&
          googleAdsConfigs.enabled &&
          googleAdsConfigs.purchaseTrackingMode === 'server'
        ) {
          try {
            await syncGoogleAdsPurchaseConversionForOrder({
              userId: order.userId,
              order,
              session,
            });
          } catch (syncError) {
            console.error(
              '[payment-callback] google ads purchase sync fallback failed',
              {
                orderNo,
                error: syncError,
              }
            );
          }
        }

        if (isStripeEmbeddedCallbackPending) {
          redirectUrl = appendStripeCheckoutResumeParams({
            targetUrl: resolvePaymentPricingFallbackUrl(order.checkoutLocale),
            orderNo,
          });

          await recordPaymentCallbackEvent({
            userId: order.userId,
            orderNo,
            provider: order.paymentProvider,
            paymentType: order.paymentType,
            requestContext,
            state: 'skipped',
            reason: 'stripe_checkout_incomplete',
          });
        } else {
          redirectUrl =
            googleAdsConfigs.enabled &&
            googleAdsConfigs.purchaseTrackingMode === 'browser'
              ? appendCallbackParams({
                  targetUrl: resultUrl,
                  orderNo,
                  value: convertMinorUnitsToGoogleAdsValue(
                    session.paymentInfo?.paymentAmount ??
                      order.paymentAmount ??
                      order.amount,
                    session.paymentInfo?.paymentCurrency ??
                      order.paymentCurrency ??
                      order.currency
                  ),
                  currency:
                    session.paymentInfo?.paymentCurrency ??
                    order.paymentCurrency ??
                    order.currency,
                })
              : resultUrl;

          await recordPaymentCallbackEvent({
            userId: order.userId,
            orderNo,
            provider: order.paymentProvider,
            paymentType: order.paymentType,
            requestContext,
            state: 'handled',
            reason: 'fulfilled_from_callback',
          });
        }
      }
    }
  } catch (error) {
    console.error('[payment-callback] checkout callback failed', {
      orderNo: callbackOrderNo,
      error,
    });

    if (callbackEventContext) {
      await recordPaymentCallbackEvent({
        userId: callbackEventContext.userId,
        orderNo: callbackEventContext.orderNo,
        provider: callbackEventContext.provider,
        paymentType: callbackEventContext.paymentType,
        requestContext,
        state: 'skipped',
        reason:
          error instanceof Error ? error.message : 'callback handling failed',
      });
    }
  }

  redirect(redirectUrl);
}
