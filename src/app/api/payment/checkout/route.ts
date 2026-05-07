import { z } from 'zod';

import {
  getPricingCatalogItem,
  resolvePricingCatalogAmount,
  type PaymentProviderName,
} from '@/config/website/pricing-catalog';
import {
  PaymentInterval,
  PaymentOrder,
  PaymentPrice,
  PaymentType,
} from '@/extensions/payment/types';
import { rateLimit } from '@/shared/lib/api/rate-limit';
import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import {
  PAYMENT_PRICING_PATH,
  resolvePaymentResultUrl,
} from '@/shared/lib/payment-callback';
import { parseStringMapConfig } from '@/shared/lib/payment-config';
import { getPricingItemDisplayName } from '@/shared/lib/pricing';
import { resolveRequestContext } from '@/shared/lib/request-context';
import { respData, respErr, respErrWithStatus } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';
import {
  createOrder,
  NewOrder,
  OrderStatus,
  updateOrderByOrderNo,
} from '@/shared/models/order';
import {
  buildMergedAcquisitionSnapshotFromRequestContext,
  buildOrderAttributionSnapshot,
  safeUpsertUserAcquisitionSnapshot,
} from '@/shared/models/user-acquisition';
import { getPaymentService } from '@/shared/services/payment';
import {
  recordCheckoutFailed,
  recordCheckoutSessionCreated,
  recordCheckoutStarted,
} from '@/shared/services/payment-observability';
import { getLocalizedPricingItem } from '@/shared/services/pricing';

const checkoutLimiter = rateLimit({
  uniqueTokenPerInterval: 8,
  interval: 30 * 1000,
});

const checkoutRequestSchema = z.object({
  product_id: z.string().trim().min(1),
  currency: z.string().trim().max(12).optional(),
  locale: z.string().trim().max(12).optional(),
  payment_provider: z
    .enum(['stripe', 'paypal', 'creem'])
    .optional()
    .or(z.literal('')),
  metadata: z.record(z.string(), z.string()).optional(),
});

type CheckoutRequestBody = z.infer<typeof checkoutRequestSchema>;

function getCheckoutErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'checkout failed';
}

function getCandidateProviders({
  requestedProvider,
  defaultProvider,
  allowedProviders,
  enabledProviders,
}: {
  requestedProvider?: string;
  defaultProvider?: string;
  allowedProviders?: PaymentProviderName[];
  enabledProviders: string[];
}) {
  const normalizedRequestedProvider = requestedProvider?.trim();
  const enabledSet = new Set(enabledProviders);
  const allowed = (
    allowedProviders && allowedProviders.length > 0
      ? allowedProviders
      : (enabledProviders as PaymentProviderName[])
  ).filter((provider) => enabledSet.has(provider));

  if (normalizedRequestedProvider) {
    if (!enabledSet.has(normalizedRequestedProvider)) {
      return [];
    }

    if (!allowed.includes(normalizedRequestedProvider as PaymentProviderName)) {
      return [];
    }

    return [normalizedRequestedProvider];
  }

  const ordered = [defaultProvider?.trim(), ...allowed].filter(
    Boolean
  ) as string[];

  return [...new Set(ordered)].filter((provider) => enabledSet.has(provider));
}

const routeHandlers = createSecureJsonPostRoute({
  actionName: 'payment-checkout-post',
  schema: checkoutRequestSchema,
  parseErrorMessage: 'invalid checkout payload',
  rateLimit: {
    limiter: checkoutLimiter,
    keyPrefix: 'checkout',
    message: 'too many checkout attempts, please slow down',
  },
  authorize: ({ user }) => {
    if (!user.email) {
      return respErrWithStatus('no auth, please sign in', 401);
    }

    return null;
  },
  async handler({ request: req, user, body }) {
    let createdOrderNo: string | null = null;
    let createdPrimaryProvider: string | null = null;
    let createdPaymentType: string | null = null;
    let createdRequestContext: ReturnType<typeof resolveRequestContext> | null =
      null;
    let checkoutSessionCreated = false;

    try {
      const {
        product_id,
        currency,
        locale = 'en',
        payment_provider,
        metadata,
      } = body as CheckoutRequestBody;

      const pricingItem = getPricingCatalogItem(product_id);
      if (!pricingItem) {
        return respErr('pricing item not found');
      }

      const requestContext = resolveRequestContext(req.headers, {
        locale,
        path: '/api/payment/checkout',
      });
      createdRequestContext = requestContext;
      const attributionSnapshot =
        buildMergedAcquisitionSnapshotFromRequestContext({
          requestContext,
          cookieHeader: req.headers.get('cookie'),
        });

      const pricingCopy = await getLocalizedPricingItem({
        locale,
        productId: product_id,
      });
      const configs = await getAllConfigs();
      const paymentService = await getPaymentService();
      const enabledProviders = paymentService.getProviderNames();
      if (enabledProviders.length === 0) {
        return respErr('no payment provider configured');
      }
      if (!pricingCopy) {
        return respErr('pricing copy not found');
      }

      const pricingDisplayName = getPricingItemDisplayName(
        pricingCopy,
        product_id
      );
      const requestedProvider = payment_provider?.trim() || undefined;

      const resolvedAmount = resolvePricingCatalogAmount(pricingItem, currency);
      const candidateProviders = getCandidateProviders({
        requestedProvider,
        defaultProvider: configs.default_payment_provider,
        allowedProviders: resolvedAmount.paymentProviders,
        enabledProviders,
      });

      if (candidateProviders.length === 0) {
        if (requestedProvider) {
          return respErr(
            'requested payment provider is not available for this checkout'
          );
        }

        return respErr('no supported payment provider is currently enabled');
      }

      const paymentInterval = pricingItem.interval;
      const paymentType =
        paymentInterval === PaymentInterval.ONE_TIME
          ? PaymentType.ONE_TIME
          : PaymentType.SUBSCRIPTION;
      createdPaymentType = paymentType;

      const checkoutPrice: PaymentPrice = {
        amount: resolvedAmount.amount,
        currency: resolvedAmount.currency.toLowerCase(),
      };

      const orderNo = getSnowId();
      createdOrderNo = orderNo;
      createdPrimaryProvider = candidateProviders[0] || null;
      let callbackBaseUrl = `${configs.app_url}`;
      if (locale && locale !== configs.default_locale) {
        callbackBaseUrl += `/${locale}`;
      }

      const paymentResultUrl = resolvePaymentResultUrl({
        paymentType,
        locale,
      });

      const order: NewOrder = {
        id: getUuid(),
        orderNo,
        userId: user.id,
        userEmail: user.email!,
        checkoutIpAddress: requestContext.ipAddress,
        checkoutUserAgent: requestContext.userAgent,
        checkoutDeviceType: requestContext.deviceType,
        checkoutLocale: requestContext.locale,
        checkoutCountryCode: requestContext.countryCode,
        checkoutRegionCode: requestContext.regionCode,
        status: OrderStatus.PENDING,
        amount: checkoutPrice.amount,
        currency: checkoutPrice.currency,
        productId: product_id,
        paymentType,
        paymentInterval,
        paymentProvider: candidateProviders[0],
        checkoutInfo: {
          attemptedProviders: candidateProviders,
          metadata: metadata || {},
          attribution: buildOrderAttributionSnapshot(attributionSnapshot),
        },
        createdAt: new Date(),
        productName: String(pricingDisplayName),
        description:
          typeof pricingCopy?.description === 'string'
            ? pricingCopy.description
            : '',
        callbackUrl: paymentResultUrl,
        creditsAmount: pricingItem.credits,
        creditsValidDays: pricingItem.validDays,
        planName:
          String(
            pricingCopy.plan_name ||
              pricingDisplayName ||
              pricingItem.planName ||
              ''
          ) || '',
        paymentProductId: resolvedAmount.paymentProductId,
      };

      await createOrder(order);
      await safeUpsertUserAcquisitionSnapshot({
        userId: user.id,
        snapshot: attributionSnapshot,
      });
      await recordCheckoutStarted({
        user: {
          id: user.id,
          email: user.email!,
          name: user.name,
        },
        orderNo,
        productId: product_id,
        productName: String(pricingDisplayName),
        amount: checkoutPrice.amount,
        currency: checkoutPrice.currency,
        paymentType,
        provider: candidateProviders[0],
        requestedProvider,
        candidateProviders,
        requestContext,
        metadata,
      });

      const attemptErrors: string[] = [];

      for (const providerName of candidateProviders) {
        const paymentProvider = paymentService.getProvider(providerName);
        if (!paymentProvider || paymentProvider.name !== providerName) {
          attemptErrors.push(`${providerName}: provider not available`);
          continue;
        }

        let paymentProductId = resolvedAmount.paymentProductId || '';
        if (!paymentProductId) {
          paymentProductId =
            (await getPaymentProductId(
              product_id,
              providerName,
              checkoutPrice.currency
            )) || '';
        }

        const promotionCode = await getPromotionCode(
          product_id,
          providerName,
          checkoutPrice.currency
        );

        const paymentCallbackUrl = `${configs.app_url}/api/payment/callback?order_no=${encodeURIComponent(orderNo)}`;
        const providerReturnUrl =
          providerName === 'stripe'
            ? `${paymentCallbackUrl}&session_id={CHECKOUT_SESSION_ID}`
            : paymentCallbackUrl;

        const checkoutOrder: PaymentOrder = {
          description: String(pricingDisplayName),
          customer: {
            name: user.name,
            email: user.email,
          },
          type: paymentType,
          orderNo,
          requestId: orderNo,
          metadata: {
            app_name: configs.app_name,
            order_no: orderNo,
            user_id: user.id,
            ...(metadata || {}),
          },
          successUrl: providerReturnUrl,
          cancelUrl: `${callbackBaseUrl}${PAYMENT_PRICING_PATH}`,
          price: checkoutPrice,
        };

        if (paymentProductId) {
          checkoutOrder.productId = paymentProductId;
        }

        if (paymentType === PaymentType.SUBSCRIPTION) {
          checkoutOrder.plan = {
            interval: paymentInterval,
            name: String(pricingCopy?.plan_name || pricingDisplayName),
          };
        }

        if (promotionCode) {
          checkoutOrder.discount = {
            code: promotionCode,
          };
        }

        try {
          const result = await paymentProvider.createPayment({
            order: checkoutOrder,
          });

          await updateOrderByOrderNo(orderNo, {
            status: OrderStatus.CREATED,
            paymentProvider: result.provider,
            checkoutInfo: {
              attemptedProviders: candidateProviders,
              metadata: metadata || {},
              attribution: buildOrderAttributionSnapshot(attributionSnapshot),
              selectedProvider: result.provider,
              flow: result.checkoutInfo.flow || 'redirect',
              checkoutParams: result.checkoutParams,
            },
            checkoutResult: result.checkoutResult,
            checkoutUrl: result.checkoutInfo.checkoutUrl || null,
            paymentSessionId: result.checkoutInfo.sessionId,
            paymentProductId,
            discountCode: promotionCode,
          });
          checkoutSessionCreated = true;

          await recordCheckoutSessionCreated({
            userId: user.id,
            orderNo,
            provider: result.provider,
            paymentType,
            paymentSessionId: result.checkoutInfo.sessionId,
            checkoutUrl: result.checkoutInfo.checkoutUrl || null,
            requestContext,
          });

          return respData({
            ...result.checkoutInfo,
            flow: result.checkoutInfo.flow || 'redirect',
            provider: result.provider,
            orderNo,
            paymentCallbackUrl,
            paymentResultUrl,
          });
        } catch (error) {
          attemptErrors.push(
            `${providerName}: ${getCheckoutErrorMessage(error)}`
          );
        }
      }

      await updateOrderByOrderNo(orderNo, {
        status: OrderStatus.FAILED,
        checkoutResult: {
          errors: attemptErrors,
        },
      });
      await recordCheckoutFailed({
        userId: user.id,
        email: user.email || undefined,
        name: user.name || undefined,
        orderNo,
        provider: candidateProviders[0],
        paymentType,
        requestContext,
        errors: attemptErrors,
        reason: 'all providers failed',
      });

      return respErr(
        `checkout failed: ${attemptErrors.join(' | ') || 'all providers failed'}`
      );
    } catch (error) {
      const checkoutErrorMessage = getCheckoutErrorMessage(error);

      if (
        createdOrderNo &&
        createdRequestContext &&
        createdPaymentType &&
        !checkoutSessionCreated
      ) {
        await updateOrderByOrderNo(createdOrderNo, {
          status: OrderStatus.FAILED,
          checkoutResult: {
            unexpectedError: checkoutErrorMessage,
          },
        }).catch((updateError) =>
          console.error('checkout failed to persist unexpected error:', {
            orderNo: createdOrderNo,
            updateError,
          })
        );

        await recordCheckoutFailed({
          userId: user.id,
          email: user.email || undefined,
          name: user.name || undefined,
          orderNo: createdOrderNo,
          provider: createdPrimaryProvider,
          paymentType: createdPaymentType,
          requestContext: createdRequestContext,
          errors: [checkoutErrorMessage],
          reason: 'unexpected checkout error',
        });
      }

      console.error('checkout failed:', error);
      return respErr(`checkout failed: ${checkoutErrorMessage}`);
    }
  },
});

export const { OPTIONS, POST } = routeHandlers;

async function getPaymentProductId(
  productId: string,
  provider: string,
  checkoutCurrency: string
) {
  if (provider !== 'creem') {
    return;
  }

  try {
    const configs = await getAllConfigs();
    const creemProductIds = configs.creem_product_ids;
    if (creemProductIds) {
      const productIds = parseStringMapConfig(creemProductIds, {
        configKey: 'creem_product_ids',
      });
      if (!productIds) {
        return;
      }

      return (
        productIds[`${productId}_${checkoutCurrency}`] || productIds[productId]
      );
    }
  } catch (error) {
    console.warn('[payment/checkout] failed to resolve payment product id', {
      productId,
      provider,
      checkoutCurrency,
      error,
    });
  }
}

async function getPromotionCode(
  productId: string,
  provider: string,
  checkoutCurrency: string
) {
  if (provider !== 'stripe') {
    return;
  }

  try {
    const configs = await getAllConfigs();
    const stripePromotionCodes = configs.stripe_promotion_codes;
    if (stripePromotionCodes) {
      const promotionCodes = parseStringMapConfig(stripePromotionCodes, {
        configKey: 'stripe_promotion_codes',
      });
      if (!promotionCodes) {
        return;
      }

      return (
        promotionCodes[`${productId}_${checkoutCurrency}`] ||
        promotionCodes[productId]
      );
    }
  } catch (error) {
    console.warn('[payment/checkout] failed to resolve promotion code', {
      productId,
      provider,
      checkoutCurrency,
      error,
    });
  }
}
