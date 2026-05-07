import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  resolvePaymentPricingFallbackUrl: vi.fn(),
  resolvePaymentResultUrl: vi.fn(),
  resolveRequestContext: vi.fn(),
  getAllConfigs: vi.fn(),
  findOrderByOrderNo: vi.fn(),
  getUserInfo: vi.fn(),
  getPaymentService: vi.fn(),
  handleCheckoutSuccess: vi.fn(),
  recordPaymentCallbackEvent: vi.fn(),
  syncGoogleAdsPurchaseConversionForOrder: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/shared/lib/payment-callback', () => ({
  resolvePaymentPricingFallbackUrl: mocks.resolvePaymentPricingFallbackUrl,
  resolvePaymentResultUrl: mocks.resolvePaymentResultUrl,
}));

vi.mock('@/shared/lib/request-context', () => ({
  resolveRequestContext: mocks.resolveRequestContext,
}));

vi.mock('@/shared/models/config', () => ({
  getAllConfigs: mocks.getAllConfigs,
}));

vi.mock('@/shared/models/order', () => ({
  findOrderByOrderNo: mocks.findOrderByOrderNo,
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: mocks.getUserInfo,
}));

vi.mock('@/shared/services/payment', () => ({
  getPaymentService: mocks.getPaymentService,
  handleCheckoutSuccess: mocks.handleCheckoutSuccess,
}));

vi.mock('@/shared/services/payment-observability', () => ({
  recordPaymentCallbackEvent: mocks.recordPaymentCallbackEvent,
}));

vi.mock('@/shared/services/google-ads-purchase-sync', () => ({
  syncGoogleAdsPurchaseConversionForOrder:
    mocks.syncGoogleAdsPurchaseConversionForOrder,
}));

describe('/api/payment/callback contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.resolvePaymentPricingFallbackUrl.mockImplementation(
      (locale?: string) =>
        locale === 'zh'
          ? 'https://mogged.games/zh/pricing'
          : 'https://mogged.games/pricing'
    );
    mocks.resolvePaymentResultUrl.mockReturnValue(
      'https://mogged.games/settings/payments'
    );
    mocks.resolveRequestContext.mockReturnValue({
      path: '/api/payment/callback',
      ipAddress: '1.2.3.4',
    });
    mocks.getAllConfigs.mockResolvedValue({
      enable_ads_tracking: 'true',
      google_ads_purchase_tracking_mode: 'browser',
    });
    mocks.recordPaymentCallbackEvent.mockResolvedValue(undefined);
    mocks.handleCheckoutSuccess.mockResolvedValue(undefined);
    mocks.syncGoogleAdsPurchaseConversionForOrder.mockResolvedValue({
      status: 'uploaded',
      jobId: 123,
    });
  });

  it('redirects to the pricing fallback when callback params are missing', async () => {
    await GET(new Request('https://example.com/api/payment/callback'));

    expect(mocks.findOrderByOrderNo).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      'https://mogged.games/pricing'
    );
  });

  it('syncs the checkout session without depending on the current browser auth state', async () => {
    const getPaymentSession = vi.fn().mockResolvedValue({
      provider: 'stripe',
      paymentStatus: 'paid',
      paymentInfo: {
        paymentAmount: 2900,
        paymentCurrency: 'usd',
      },
    });

    mocks.findOrderByOrderNo.mockResolvedValue({
      orderNo: 'ord_1',
      userId: 'user-1',
      callbackUrl: 'https://mogged.games/settings/payments',
      paymentType: 'one-time',
      checkoutLocale: 'en',
      paymentSessionId: 'sess_1',
      paymentProvider: 'stripe',
    });
    mocks.getUserInfo.mockResolvedValue(null);
    mocks.getPaymentService.mockResolvedValue({
      getProvider: vi.fn(() => ({
        getPaymentSession,
      })),
    });

    await GET(
      new Request('https://example.com/api/payment/callback?order_no=ord_1')
    );

    expect(mocks.recordPaymentCallbackEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: 'user-1',
        orderNo: 'ord_1',
        provider: 'stripe',
        state: 'arrived',
      })
    );
    expect(getPaymentSession).toHaveBeenCalledWith({
      sessionId: 'sess_1',
    });
    expect(mocks.handleCheckoutSuccess).toHaveBeenCalledWith({
      order: expect.objectContaining({
        orderNo: 'ord_1',
      }),
      session: expect.objectContaining({
        paymentStatus: 'paid',
      }),
    });
    expect(mocks.recordPaymentCallbackEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: 'user-1',
        orderNo: 'ord_1',
        provider: 'stripe',
        state: 'handled',
        reason: 'fulfilled_from_callback',
      })
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      'https://mogged.games/settings/payments?order_no=ord_1&google_ads_purchase=1&google_ads_value=29&google_ads_currency=USD'
    );
  });

  it('skips browser purchase params when purchase tracking is in server mode', async () => {
    mocks.getAllConfigs.mockResolvedValue({
      enable_ads_tracking: 'true',
      google_ads_purchase_tracking_mode: 'server',
    });
    mocks.findOrderByOrderNo.mockResolvedValue({
      orderNo: 'ord_2',
      userId: 'user-2',
      callbackUrl: 'https://mogged.games/settings/payments',
      paymentType: 'one-time',
      checkoutLocale: 'en',
      paymentSessionId: '',
      paymentProvider: 'stripe',
      amount: 2900,
      currency: 'usd',
    });
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-2',
      email: 'demo@example.com',
    });

    await GET(
      new Request('https://example.com/api/payment/callback?order_no=ord_2')
    );

    expect(mocks.redirect).toHaveBeenCalledWith(
      'https://mogged.games/settings/payments'
    );
  });

  it('uploads a server-side purchase conversion after callback fulfillment in server mode', async () => {
    const getPaymentSession = vi.fn().mockResolvedValue({
      provider: 'stripe',
      paymentStatus: 'paid',
      paymentInfo: {
        paymentAmount: 2900,
        paymentCurrency: 'usd',
        paidAt: '2026-04-14T06:07:08.000Z',
      },
    });

    mocks.getAllConfigs.mockResolvedValue({
      enable_ads_tracking: 'true',
      google_ads_purchase_tracking_mode: 'server',
    });
    mocks.findOrderByOrderNo.mockResolvedValue({
      id: 'order_id_1',
      orderNo: 'ord_3',
      userId: 'user-3',
      callbackUrl: 'https://mogged.games/settings/payments',
      paymentType: 'one-time',
      checkoutLocale: 'en',
      paymentSessionId: 'sess_3',
      paymentProvider: 'stripe',
      amount: 2900,
      currency: 'usd',
    });
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-3',
      email: 'demo@example.com',
    });
    mocks.getPaymentService.mockResolvedValue({
      getProvider: vi.fn(() => ({
        getPaymentSession,
      })),
    });

    await GET(
      new Request('https://example.com/api/payment/callback?order_no=ord_3')
    );

    expect(mocks.syncGoogleAdsPurchaseConversionForOrder).toHaveBeenCalledWith({
      userId: 'user-3',
      order: expect.objectContaining({
        orderNo: 'ord_3',
      }),
      session: expect.objectContaining({
        paymentStatus: 'paid',
      }),
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      'https://mogged.games/settings/payments'
    );
  });

  it('routes incomplete Stripe embedded return_url callbacks back to localized pricing', async () => {
    const getPaymentSession = vi.fn().mockResolvedValue({
      provider: 'stripe',
      paymentStatus: 'processing',
      paymentInfo: {
        paymentAmount: 2900,
        paymentCurrency: 'cny',
      },
    });

    mocks.findOrderByOrderNo.mockResolvedValue({
      orderNo: 'ord_4',
      userId: 'user-4',
      callbackUrl: 'https://mogged.games/zh/settings/payments',
      paymentType: 'one-time',
      checkoutLocale: 'zh',
      paymentSessionId: 'sess_4',
      paymentProvider: 'stripe',
      amount: 2900,
      currency: 'cny',
    });
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-4',
      email: 'demo@example.com',
    });
    mocks.getPaymentService.mockResolvedValue({
      getProvider: vi.fn(() => ({
        getPaymentSession,
      })),
    });

    await GET(
      new Request('https://example.com/api/payment/callback?order_no=ord_4')
    );

    expect(mocks.handleCheckoutSuccess).toHaveBeenCalledWith({
      order: expect.objectContaining({
        orderNo: 'ord_4',
      }),
      session: expect.objectContaining({
        paymentStatus: 'processing',
      }),
    });
    expect(mocks.recordPaymentCallbackEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: 'user-4',
        orderNo: 'ord_4',
        provider: 'stripe',
        state: 'skipped',
        reason: 'stripe_checkout_incomplete',
      })
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      'https://mogged.games/zh/pricing?stripe_checkout_resume=1&order_no=ord_4'
    );
  });
});
