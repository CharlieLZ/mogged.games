import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentInterval } from '@/extensions/payment/types';
import { OrderStatus } from '@/shared/models/order';

import { POST } from './route';

const testGlobals = globalThis as typeof globalThis & {
  __imageeditoraiRateLimitStore?: Map<string, unknown>;
};

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  enforceApiWriteSecurity: vi.fn(),
  getUserInfo: vi.fn(),
  getPricingCatalogItem: vi.fn(),
  resolvePricingCatalogAmount: vi.fn(),
  getLocalizedPricingItem: vi.fn(),
  getAllConfigs: vi.fn(),
  getPaymentService: vi.fn(),
  createOrder: vi.fn(),
  updateOrderByOrderNo: vi.fn(),
  recordCheckoutStarted: vi.fn(),
  recordCheckoutSessionCreated: vi.fn(),
  recordCheckoutFailed: vi.fn(),
  buildMergedAcquisitionSnapshotFromRequestContext: vi.fn(),
  buildOrderAttributionSnapshot: vi.fn(),
  safeUpsertUserAcquisitionSnapshot: vi.fn(),
  getSnowId: vi.fn(),
  getUuid: vi.fn(),
  getPricingItemDisplayName: vi.fn(),
  resolveRequestContext: vi.fn(),
  getClientIpFromHeaders: vi.fn(),
  resolvePaymentResultUrl: vi.fn(),
}));

vi.mock('@/shared/lib/api/request-security', () => ({
  createApiPreflightResponse: vi.fn(() => new Response(null, { status: 204 })),
  enforceApiWriteSecurity: mocks.enforceApiWriteSecurity,
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: mocks.getUserInfo,
}));

vi.mock('@/config/website/pricing-catalog', () => ({
  getPricingCatalogItem: mocks.getPricingCatalogItem,
  resolvePricingCatalogAmount: mocks.resolvePricingCatalogAmount,
}));

vi.mock('@/shared/services/pricing', () => ({
  getLocalizedPricingItem: mocks.getLocalizedPricingItem,
}));

vi.mock('@/shared/models/config', () => ({
  getAllConfigs: mocks.getAllConfigs,
}));

vi.mock('@/shared/services/payment', () => ({
  getPaymentService: mocks.getPaymentService,
}));

vi.mock('@/shared/models/order', () => ({
  OrderStatus: {
    PENDING: 'pending',
    CREATED: 'created',
    FAILED: 'failed',
  },
  createOrder: mocks.createOrder,
  updateOrderByOrderNo: mocks.updateOrderByOrderNo,
}));

vi.mock('@/shared/services/payment-observability', () => ({
  recordCheckoutStarted: mocks.recordCheckoutStarted,
  recordCheckoutSessionCreated: mocks.recordCheckoutSessionCreated,
  recordCheckoutFailed: mocks.recordCheckoutFailed,
}));

vi.mock('@/shared/models/user-acquisition', () => ({
  buildMergedAcquisitionSnapshotFromRequestContext:
    mocks.buildMergedAcquisitionSnapshotFromRequestContext,
  buildOrderAttributionSnapshot: mocks.buildOrderAttributionSnapshot,
  safeUpsertUserAcquisitionSnapshot: mocks.safeUpsertUserAcquisitionSnapshot,
}));

vi.mock('@/shared/lib/hash', () => ({
  getSnowId: mocks.getSnowId,
  getUuid: mocks.getUuid,
}));

vi.mock('@/shared/lib/pricing', () => ({
  getPricingItemDisplayName: mocks.getPricingItemDisplayName,
}));

vi.mock('@/shared/lib/request-context', () => ({
  resolveRequestContext: mocks.resolveRequestContext,
  getClientIpFromHeaders: mocks.getClientIpFromHeaders,
}));

vi.mock('@/shared/lib/payment-callback', () => ({
  PAYMENT_PRICING_PATH: '/pricing',
  resolvePaymentResultUrl: mocks.resolvePaymentResultUrl,
}));

describe('/api/payment/checkout contract', () => {
  beforeEach(() => {
    testGlobals.__imageeditoraiRateLimitStore?.clear();
    vi.clearAllMocks();

    mocks.enforceApiWriteSecurity.mockResolvedValue(null);
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
    });
    mocks.getPricingCatalogItem.mockReturnValue({
      interval: PaymentInterval.ONE_TIME,
      credits: 100,
      validDays: 30,
      planName: 'Starter',
    });
    mocks.resolvePricingCatalogAmount.mockReturnValue({
      amount: 29,
      currency: 'USD',
      paymentProviders: ['stripe', 'paypal'],
      paymentProductId: '',
    });
    mocks.getLocalizedPricingItem.mockResolvedValue({
      plan_name: 'Starter',
      description: 'Starter credits',
    });
    mocks.getAllConfigs.mockResolvedValue({
      default_payment_provider: 'stripe',
      default_locale: 'en',
      app_name: 'mogged',
      app_url: 'https://mogged.games',
      stripe_promotion_codes: '',
      creem_product_ids: '',
    });
    mocks.getPaymentService.mockResolvedValue({
      getProviderNames: vi.fn(() => ['stripe', 'paypal']),
      getProvider: vi.fn(),
    });
    mocks.createOrder.mockResolvedValue(null);
    mocks.updateOrderByOrderNo.mockResolvedValue(null);
    mocks.recordCheckoutStarted.mockResolvedValue(undefined);
    mocks.recordCheckoutSessionCreated.mockResolvedValue(undefined);
    mocks.recordCheckoutFailed.mockResolvedValue(undefined);
    mocks.buildMergedAcquisitionSnapshotFromRequestContext.mockReturnValue({
      source: 'google',
      gclid: 'test-gclid',
      landing_path: '/pricing',
    });
    mocks.buildOrderAttributionSnapshot.mockReturnValue({
      source: 'google',
      gclid: 'test-gclid',
    });
    mocks.safeUpsertUserAcquisitionSnapshot.mockResolvedValue(undefined);
    mocks.getSnowId.mockReturnValue('order_1');
    mocks.getUuid.mockReturnValue('uuid-1');
    mocks.getPricingItemDisplayName.mockReturnValue('Starter');
    mocks.resolveRequestContext.mockReturnValue({
      ipAddress: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
      deviceType: 'desktop',
      locale: 'en',
      countryCode: 'US',
      regionCode: 'CA',
      path: '/api/payment/checkout',
      referer: 'https://mogged.games/pricing?gclid=test-gclid',
    });
    mocks.getClientIpFromHeaders.mockReturnValue('1.2.3.4');
    mocks.resolvePaymentResultUrl.mockReturnValue(
      'https://mogged.games/settings/payments'
    );
  });

  it('falls back to the next payment provider when the first checkout attempt fails', async () => {
    const createPaymentStripe = vi
      .fn()
      .mockRejectedValue(new Error('stripe unavailable'));
    const createPaymentPayPal = vi.fn().mockResolvedValue({
      provider: 'paypal',
      checkoutInfo: {
        sessionId: 'sess_paypal_1',
        checkoutUrl: 'https://paypal.example.com/checkout',
      },
      checkoutResult: {
        id: 'checkout_1',
      },
      checkoutParams: {
        order: 'paypal',
      },
    });

    mocks.getPaymentService.mockResolvedValue({
      getProviderNames: vi.fn(() => ['stripe', 'paypal']),
      getProvider: vi.fn((provider: string) => {
        if (provider === 'stripe') {
          return {
            name: 'stripe',
            createPayment: createPaymentStripe,
          };
        }

        if (provider === 'paypal') {
          return {
            name: 'paypal',
            createPayment: createPaymentPayPal,
          };
        }

        return null;
      }),
    });

    const response = await POST(
      new Request('https://example.com/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          product_id: 'starter',
          locale: 'en',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      message: 'ok',
      data: {
        provider: 'paypal',
        orderNo: 'order_1',
        sessionId: 'sess_paypal_1',
        checkoutUrl: 'https://paypal.example.com/checkout',
      },
    });
    expect(mocks.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'order_1',
        paymentProvider: 'stripe',
        status: OrderStatus.PENDING,
        checkoutInfo: expect.objectContaining({
          attribution: {
            source: 'google',
            gclid: 'test-gclid',
          },
        }),
      })
    );
    expect(createPaymentStripe).toHaveBeenCalledTimes(1);
    expect(createPaymentPayPal).toHaveBeenCalledTimes(1);
    expect(mocks.updateOrderByOrderNo).toHaveBeenCalledWith(
      'order_1',
      expect.objectContaining({
        status: OrderStatus.CREATED,
        paymentProvider: 'paypal',
        paymentSessionId: 'sess_paypal_1',
        checkoutUrl: 'https://paypal.example.com/checkout',
        checkoutInfo: expect.objectContaining({
          attemptedProviders: ['stripe', 'paypal'],
          selectedProvider: 'paypal',
        }),
      })
    );
    expect(mocks.recordCheckoutStarted).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'order_1',
        candidateProviders: ['stripe', 'paypal'],
        provider: 'stripe',
      })
    );
    expect(mocks.recordCheckoutSessionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'order_1',
        provider: 'paypal',
      })
    );
    expect(mocks.recordCheckoutFailed).not.toHaveBeenCalled();
    expect(mocks.safeUpsertUserAcquisitionSnapshot).toHaveBeenCalledWith({
      userId: 'user-1',
      snapshot: {
        source: 'google',
        gclid: 'test-gclid',
        landing_path: '/pricing',
      },
    });
  });

  it('returns an embedded Stripe checkout contract without forcing a redirect url', async () => {
    const createPaymentStripe = vi.fn().mockResolvedValue({
      provider: 'stripe',
      checkoutInfo: {
        sessionId: 'sess_stripe_1',
        checkoutUrl: null,
        clientSecret: 'cs_test_client_secret',
        flow: 'embedded',
      },
      checkoutResult: {
        id: 'cs_test_123',
      },
      checkoutParams: {
        ui_mode: 'embedded',
      },
    });

    mocks.getPaymentService.mockResolvedValue({
      getProviderNames: vi.fn(() => ['stripe', 'paypal']),
      getProvider: vi.fn((provider: string) => {
        if (provider === 'stripe') {
          return {
            name: 'stripe',
            createPayment: createPaymentStripe,
          };
        }

        return null;
      }),
    });

    const response = await POST(
      new Request('https://example.com/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          product_id: 'starter',
          locale: 'en',
          payment_provider: 'stripe',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      message: 'ok',
      data: {
        provider: 'stripe',
        orderNo: 'order_1',
        sessionId: 'sess_stripe_1',
        flow: 'embedded',
        clientSecret: 'cs_test_client_secret',
        paymentResultUrl: 'https://mogged.games/settings/payments',
        paymentCallbackUrl:
          'https://mogged.games/api/payment/callback?order_no=order_1',
      },
    });
    expect(createPaymentStripe).toHaveBeenCalledWith({
      order: expect.objectContaining({
        successUrl:
          'https://mogged.games/api/payment/callback?order_no=order_1&session_id={CHECKOUT_SESSION_ID}',
      }),
    });
    expect(mocks.updateOrderByOrderNo).toHaveBeenCalledWith(
      'order_1',
      expect.objectContaining({
        status: OrderStatus.CREATED,
        paymentProvider: 'stripe',
        paymentSessionId: 'sess_stripe_1',
        checkoutUrl: null,
        checkoutInfo: expect.objectContaining({
          attemptedProviders: ['stripe'],
          selectedProvider: 'stripe',
          checkoutParams: {
            ui_mode: 'embedded',
          },
        }),
      })
    );
    expect(mocks.recordCheckoutSessionCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'order_1',
        provider: 'stripe',
        paymentSessionId: 'sess_stripe_1',
        checkoutUrl: null,
      })
    );
  });

  it('does not fall back to Stripe when an explicitly requested PayPal checkout fails', async () => {
    const createPaymentStripe = vi.fn().mockResolvedValue({
      provider: 'stripe',
      checkoutInfo: {
        sessionId: 'sess_stripe_1',
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123',
      },
      checkoutResult: {
        id: 'cs_test_123',
      },
      checkoutParams: {},
    });
    const createPaymentPayPal = vi
      .fn()
      .mockRejectedValue(new Error('paypal down'));

    mocks.getPaymentService.mockResolvedValue({
      getProviderNames: vi.fn(() => ['stripe', 'paypal']),
      getProvider: vi.fn((provider: string) => {
        if (provider === 'stripe') {
          return {
            name: 'stripe',
            createPayment: createPaymentStripe,
          };
        }

        if (provider === 'paypal') {
          return {
            name: 'paypal',
            createPayment: createPaymentPayPal,
          };
        }

        return null;
      }),
    });

    const response = await POST(
      new Request('https://example.com/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          product_id: 'starter',
          locale: 'en',
          payment_provider: 'paypal',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'checkout failed: paypal: paypal down',
    });
    expect(createPaymentPayPal).toHaveBeenCalledTimes(1);
    expect(createPaymentStripe).not.toHaveBeenCalled();
    expect(mocks.updateOrderByOrderNo).toHaveBeenCalledWith('order_1', {
      status: OrderStatus.FAILED,
      checkoutResult: {
        errors: ['paypal: paypal down'],
      },
    });
    expect(mocks.recordCheckoutStarted).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'order_1',
        provider: 'paypal',
        requestedProvider: 'paypal',
        candidateProviders: ['paypal'],
      })
    );
    expect(mocks.recordCheckoutFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'order_1',
        provider: 'paypal',
        errors: ['paypal: paypal down'],
      })
    );
  });

  it('does not fall back to Stripe when the explicitly requested Creem provider is unavailable', async () => {
    const createPaymentStripe = vi.fn();

    mocks.resolvePricingCatalogAmount.mockReturnValue({
      amount: 29,
      currency: 'USD',
      paymentProviders: ['stripe', 'creem'],
      paymentProductId: '',
    });
    mocks.getPaymentService.mockResolvedValue({
      getProviderNames: vi.fn(() => ['stripe']),
      getProvider: vi.fn((provider: string) => {
        if (provider === 'stripe') {
          return {
            name: 'stripe',
            createPayment: createPaymentStripe,
          };
        }

        return null;
      }),
    });

    const response = await POST(
      new Request('https://example.com/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          product_id: 'starter',
          locale: 'en',
          payment_provider: 'creem',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'requested payment provider is not available for this checkout',
    });
    expect(createPaymentStripe).not.toHaveBeenCalled();
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.recordCheckoutStarted).not.toHaveBeenCalled();
    expect(mocks.recordCheckoutFailed).not.toHaveBeenCalled();
  });

  it('marks the order failed when every candidate provider rejects checkout creation', async () => {
    mocks.getPaymentService.mockResolvedValue({
      getProviderNames: vi.fn(() => ['stripe', 'paypal']),
      getProvider: vi.fn((provider: string) => ({
        name: provider,
        createPayment: vi
          .fn()
          .mockRejectedValue(
            new Error(provider === 'stripe' ? 'stripe down' : 'paypal down')
          ),
      })),
    });

    const response = await POST(
      new Request('https://example.com/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          product_id: 'starter',
          locale: 'en',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'checkout failed: stripe: stripe down | paypal: paypal down',
    });
    expect(mocks.updateOrderByOrderNo).toHaveBeenCalledWith('order_1', {
      status: OrderStatus.FAILED,
      checkoutResult: {
        errors: ['stripe: stripe down', 'paypal: paypal down'],
      },
    });
    expect(mocks.recordCheckoutFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'order_1',
        provider: 'stripe',
        reason: 'all providers failed',
        errors: ['stripe: stripe down', 'paypal: paypal down'],
      })
    );
  });
});
