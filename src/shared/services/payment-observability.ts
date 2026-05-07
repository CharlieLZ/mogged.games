import {
  sendCheckoutNotification,
  sendErrorNotification,
} from '@/extensions/notification';
import type { RequestContextSnapshot } from '@/shared/lib/request-context';
import { safeRecordUserContextEvent } from '@/shared/models/user_context_event';

type CheckoutActor = {
  id: string;
  email: string;
  name?: string | null;
};

type CheckoutBaseEventInput = {
  user: CheckoutActor;
  orderNo: string;
  productId: string;
  productName: string;
  amount: number;
  currency: string;
  paymentType: string;
  provider: string;
  requestedProvider?: string | null;
  candidateProviders?: string[];
  requestContext: RequestContextSnapshot;
  metadata?: Record<string, string>;
};

type CheckoutSessionCreatedInput = {
  userId: string;
  orderNo: string;
  provider: string;
  paymentType: string;
  paymentSessionId?: string | null;
  checkoutUrl?: string | null;
  requestContext: RequestContextSnapshot;
};

type CheckoutFailedInput = {
  userId: string;
  email?: string | null;
  name?: string | null;
  orderNo: string;
  provider?: string | null;
  paymentType: string;
  requestContext: RequestContextSnapshot;
  errors: string[];
  reason?: string | null;
};

type PaymentCallbackEventInput = {
  userId: string;
  orderNo: string;
  provider?: string | null;
  paymentType?: string | null;
  requestContext: RequestContextSnapshot;
  state: 'arrived' | 'handled' | 'skipped';
  reason?: string | null;
};

function normalizeProvider(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function resolveFallbackFrom({
  provider,
  requestedProvider,
}: {
  provider: string;
  requestedProvider?: string | null;
}) {
  const normalizedRequestedProvider = normalizeProvider(requestedProvider);
  if (
    !normalizedRequestedProvider ||
    normalizedRequestedProvider === provider
  ) {
    return null;
  }

  return normalizedRequestedProvider;
}

function normalizeMetadataKeys(metadata?: Record<string, string>): string[] {
  if (!metadata) {
    return [];
  }

  return Object.keys(metadata)
    .map((key) => key.trim())
    .filter(Boolean)
    .sort();
}

function resolveUrlHost(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).host || null;
  } catch {
    return null;
  }
}

function buildCheckoutFailureMessage(input: CheckoutFailedInput): string {
  const reason = normalizeProvider(input.reason);
  const errors = input.errors.map((item) => item.trim()).filter(Boolean).slice(0, 5);

  return [reason, ...errors].filter(Boolean).join(' | ') || 'checkout failed';
}

export async function recordCheckoutStarted(
  input: CheckoutBaseEventInput
): Promise<void> {
  const fallbackFrom = resolveFallbackFrom({
    provider: input.provider,
    requestedProvider: input.requestedProvider,
  });
  const metadataKeys = normalizeMetadataKeys(input.metadata);

  await safeRecordUserContextEvent({
    userId: input.user.id,
    eventType: 'payment_checkout_started',
    ...input.requestContext,
    metadata: {
      orderNo: input.orderNo,
      productId: input.productId,
      productName: input.productName,
      amount: input.amount,
      currency: input.currency,
      provider: input.provider,
      requestedProvider: normalizeProvider(input.requestedProvider),
      fallbackFrom,
      paymentType: input.paymentType,
      attemptedProviders: input.candidateProviders || [],
      metadataKeys,
      scene: 'checkout',
    },
  });

  try {
    const notificationResult = await sendCheckoutNotification({
      email: input.user.email,
      name: input.user.name,
      userId: input.user.id,
      orderNo: input.orderNo,
      productId: input.productId,
      productName: input.productName,
      amount: input.amount,
      currency: input.currency,
      paymentType: input.paymentType,
      provider: input.provider,
      requestedProvider: normalizeProvider(input.requestedProvider),
      fallbackFrom,
      locale: input.requestContext.locale,
      countryCode: input.requestContext.countryCode,
      regionCode: input.requestContext.regionCode,
      deviceType: input.requestContext.deviceType,
      referer: input.requestContext.referer,
      attemptedProviders: input.candidateProviders,
      metadataKeys,
    });

    if (notificationResult.code !== 0) {
      console.warn('[payment-observability] checkout notification skipped', {
        orderNo: input.orderNo,
        provider: input.provider,
        result: notificationResult,
      });
    }
  } catch (error) {
    console.warn('[payment-observability] checkout notification failed', {
      orderNo: input.orderNo,
      provider: input.provider,
      error,
    });
  }
}

export async function recordCheckoutSessionCreated(
  input: CheckoutSessionCreatedInput
): Promise<void> {
  await safeRecordUserContextEvent({
    userId: input.userId,
    eventType: 'payment_checkout_session_created',
    ...input.requestContext,
    metadata: {
      orderNo: input.orderNo,
      provider: input.provider,
      paymentType: input.paymentType,
      paymentSessionId: normalizeProvider(input.paymentSessionId),
      checkoutUrlHost: resolveUrlHost(input.checkoutUrl),
      scene: 'checkout',
    },
  });
}

export async function recordCheckoutFailed(
  input: CheckoutFailedInput
): Promise<void> {
  await safeRecordUserContextEvent({
    userId: input.userId,
    eventType: 'payment_checkout_failed',
    ...input.requestContext,
    metadata: {
      orderNo: input.orderNo,
      provider: normalizeProvider(input.provider),
      paymentType: input.paymentType,
      errorCount: input.errors.length,
      errors: input.errors.slice(0, 5),
      reason: normalizeProvider(input.reason),
      scene: 'checkout',
    },
  });

  try {
    const notificationResult = await sendErrorNotification({
      email: input.email || undefined,
      name: input.name || undefined,
      apiEndpoint: input.requestContext.path || '/api/payment/checkout',
      apiProvider: normalizeProvider(input.provider) || undefined,
      errorCode: 'payment_checkout_failed',
      errorMessage: buildCheckoutFailureMessage(input),
      type: 'payment_checkout_failed',
      taskId: input.orderNo,
    });

    if (notificationResult.code !== 0) {
      console.warn('[payment-observability] checkout error notification skipped', {
        orderNo: input.orderNo,
        provider: input.provider,
        result: notificationResult,
      });
    }
  } catch (error) {
    console.warn('[payment-observability] checkout error notification failed', {
      orderNo: input.orderNo,
      provider: input.provider,
      error,
    });
  }
}

export async function recordPaymentCallbackEvent(
  input: PaymentCallbackEventInput
): Promise<void> {
  await safeRecordUserContextEvent({
    userId: input.userId,
    eventType: `payment_callback_${input.state}`,
    ...input.requestContext,
    metadata: {
      orderNo: input.orderNo,
      provider: normalizeProvider(input.provider),
      paymentType: normalizeProvider(input.paymentType),
      reason: normalizeProvider(input.reason),
      scene: 'payment_callback',
    },
  });
}
