import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  sendCheckoutNotification,
  sendErrorNotification,
} from '@/extensions/notification';
import { safeRecordUserContextEvent } from '@/shared/models/user_context_event';

import {
  recordCheckoutFailed,
  recordCheckoutSessionCreated,
  recordCheckoutStarted,
  recordPaymentCallbackEvent,
} from './payment-observability';

vi.mock('@/extensions/notification', () => ({
  sendCheckoutNotification: vi.fn(),
  sendErrorNotification: vi.fn(),
}));

vi.mock('@/shared/models/user_context_event', () => ({
  safeRecordUserContextEvent: vi.fn(),
}));

const requestContext = {
  ipAddress: '1.1.1.1',
  userAgent: 'Mozilla/5.0',
  deviceType: 'desktop' as const,
  locale: 'en',
  countryCode: 'US',
  regionCode: 'CA',
  path: '/api/payment/checkout',
  referer: 'https://mogged.games/pricing',
};

describe('payment observability', () => {
  beforeEach(() => {
    vi.mocked(safeRecordUserContextEvent).mockReset();
    vi.mocked(sendCheckoutNotification).mockReset();
    vi.mocked(sendErrorNotification).mockReset();
    vi.mocked(safeRecordUserContextEvent).mockResolvedValue(null);
    vi.mocked(sendCheckoutNotification).mockResolvedValue({
      code: 0,
      msg: 'ok',
    } as never);
    vi.mocked(sendErrorNotification).mockResolvedValue({
      code: 0,
      msg: 'ok',
    } as never);
  });

  it('records checkout started and sends checkout notification', async () => {
    await recordCheckoutStarted({
      user: {
        id: 'user_123',
        email: 'alice@example.com',
        name: 'Alice',
      },
      orderNo: 'ord_123',
      productId: 'pro-monthly',
      productName: 'Pro Monthly',
      amount: 4900,
      currency: 'usd',
      paymentType: 'subscription',
      provider: 'paypal',
      requestedProvider: 'stripe',
      candidateProviders: ['paypal', 'stripe'],
      requestContext,
      metadata: {
        affonso_referral: 'abc',
      },
    });

    expect(safeRecordUserContextEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        eventType: 'payment_checkout_started',
        metadata: expect.objectContaining({
          orderNo: 'ord_123',
          provider: 'paypal',
          requestedProvider: 'stripe',
          fallbackFrom: 'stripe',
          attemptedProviders: ['paypal', 'stripe'],
          metadataKeys: ['affonso_referral'],
        }),
      })
    );

    expect(sendCheckoutNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@example.com',
        userId: 'user_123',
        orderNo: 'ord_123',
        provider: 'paypal',
        requestedProvider: 'stripe',
        fallbackFrom: 'stripe',
        attemptedProviders: ['paypal', 'stripe'],
        countryCode: 'US',
      })
    );
  });

  it('does not throw when checkout notification fails', async () => {
    vi.mocked(sendCheckoutNotification).mockRejectedValue(new Error('boom'));

    await expect(
      recordCheckoutStarted({
        user: {
          id: 'user_123',
          email: 'alice@example.com',
        },
        orderNo: 'ord_123',
        productId: 'try-onetime',
        productName: 'Try',
        amount: 990,
        currency: 'usd',
        paymentType: 'one-time',
        provider: 'paypal',
        requestContext,
      })
    ).resolves.toBeUndefined();
  });

  it('records checkout session creation host details', async () => {
    await recordCheckoutSessionCreated({
      userId: 'user_123',
      orderNo: 'ord_123',
      provider: 'paypal',
      paymentType: 'subscription',
      paymentSessionId: 'session_123',
      checkoutUrl: 'https://www.paypal.com/checkoutnow?token=abc',
      requestContext,
    });

    expect(safeRecordUserContextEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'payment_checkout_session_created',
        metadata: expect.objectContaining({
          paymentSessionId: 'session_123',
          checkoutUrlHost: 'www.paypal.com',
        }),
      })
    );
  });

  it('records checkout failures and sends error notification', async () => {
    await recordCheckoutFailed({
      userId: 'user_123',
      email: 'alice@example.com',
      name: 'Alice',
      orderNo: 'ord_123',
      provider: 'paypal',
      paymentType: 'subscription',
      requestContext,
      errors: ['paypal: timeout', 'stripe: invalid session'],
      reason: 'all providers failed',
    });

    expect(safeRecordUserContextEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'payment_checkout_failed',
        metadata: expect.objectContaining({
          errorCount: 2,
          reason: 'all providers failed',
        }),
      })
    );

    expect(sendErrorNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@example.com',
        name: 'Alice',
        apiEndpoint: '/api/payment/checkout',
        apiProvider: 'paypal',
        errorCode: 'payment_checkout_failed',
        taskId: 'ord_123',
      })
    );
  });

  it('records callback states', async () => {
    await recordPaymentCallbackEvent({
      userId: 'user_123',
      orderNo: 'ord_123',
      provider: 'paypal',
      paymentType: 'subscription',
      requestContext,
      state: 'handled',
      reason: 'fulfilled_from_callback',
    });

    expect(safeRecordUserContextEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'payment_callback_handled',
        metadata: expect.objectContaining({
          reason: 'fulfilled_from_callback',
        }),
      })
    );
  });
});
