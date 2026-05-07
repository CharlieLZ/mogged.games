// @vitest-environment jsdom

'use client';

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePricingCheckout } from './use-pricing-checkout';

const toastErrorMock = vi.hoisted(() => vi.fn());

const testMocks = vi.hoisted(() => ({
  appContext: {
    user: {
      id: 'user_1',
      email: 'demo@example.com',
      name: 'Demo User',
    },
    setIsShowPaymentModal: vi.fn(),
    setIsShowSignModal: vi.fn(),
    configs: {
      select_payment_enabled: 'false',
      default_payment_provider: 'stripe',
      stripe_publishable_key: 'pk_test_123',
    } as Record<string, string>,
  },
  googleAds: {
    resolveGoogleAdsConfigs: vi.fn(() => ({
      enabled: false,
      conversionId: '',
      beginCheckoutLabel: '',
      purchaseTrackingMode: 'browser',
      purchaseLabel: '',
      signupLabel: '',
    })),
    trackGoogleAdsConversion: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => testMocks.appContext,
}));

vi.mock('@/shared/lib/cookie', () => ({
  getCookie: vi.fn(() => ''),
}));

vi.mock('@/shared/lib/google-ads', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/lib/google-ads')>();

  return {
    ...actual,
    resolveGoogleAdsConfigs: testMocks.googleAds.resolveGoogleAdsConfigs,
    trackGoogleAdsConversion: testMocks.googleAds.trackGoogleAdsConversion,
  };
});

type PricingHarnessValue = ReturnType<typeof usePricingCheckout>;

function CheckoutHarness() {
  const checkout = usePricingCheckout({
    locale: 'en',
  }) as PricingHarnessValue & {
    isEmbeddedCheckoutOpen?: boolean;
    embeddedCheckoutSession?: {
      clientSecret?: string;
      paymentCallbackUrl?: string;
      paymentResultUrl?: string;
      orderNo?: string;
    } | null;
  };

  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        id: 'stripe-start',
        onClick: () =>
          checkout.startCheckoutFlow({
            product_id: 'starter',
            currency: 'USD',
            amount: 2900,
          } as any),
      },
      'start-stripe'
    ),
    createElement(
      'button',
      {
        id: 'paypal-start',
        onClick: () =>
          checkout.checkoutWithProvider(
            {
              product_id: 'starter',
              currency: 'USD',
              amount: 2900,
            } as any,
            'paypal'
          ),
      },
      'start-paypal'
    ),
    createElement(
      'button',
      {
        id: 'stripe-provider-start',
        onClick: () =>
          checkout.checkoutWithProvider(
            {
              product_id: 'starter',
              currency: 'USD',
              amount: 2900,
            } as any,
            'stripe'
          ),
      },
      'start-stripe-provider'
    ),
    createElement(
      'button',
      {
        id: 'finalize-embedded',
        onClick: () => {
          void checkout.finalizeEmbeddedCheckout();
        },
      },
      'finalize-embedded'
    ),
    createElement(
      'div',
      { id: 'embedded-open' },
      checkout.isEmbeddedCheckoutOpen ? 'open' : 'closed'
    ),
    createElement(
      'div',
      { id: 'embedded-client-secret' },
      checkout.embeddedCheckoutSession?.clientSecret || ''
    ),
    createElement(
      'div',
      { id: 'embedded-result-url' },
      checkout.embeddedCheckoutSession?.paymentResultUrl || ''
    ),
    createElement(
      'div',
      { id: 'embedded-callback-url' },
      checkout.embeddedCheckoutSession?.paymentCallbackUrl || ''
    )
  );
}

async function renderHarness() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(CheckoutHarness));
  });

  return {
    container,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('usePricingCheckout', () => {
  let locationAssignSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    window.sessionStorage.clear();
    toastErrorMock.mockReset();
    testMocks.appContext.setIsShowPaymentModal.mockReset();
    testMocks.appContext.setIsShowSignModal.mockReset();
    testMocks.appContext.configs = {
      select_payment_enabled: 'false',
      default_payment_provider: 'stripe',
      stripe_publishable_key: 'pk_test_123',
    };
    locationAssignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        assign: locationAssignSpy,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens embedded Stripe checkout state instead of redirecting for the default Stripe flow', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({
        code: 0,
        message: 'ok',
        data: {
          provider: 'stripe',
          orderNo: 'ord_1',
          flow: 'embedded',
          sessionId: 'sess_1',
          clientSecret: 'cs_test_client_secret',
          paymentResultUrl: 'https://mogged.games/settings/payments',
          paymentCallbackUrl:
            'https://mogged.games/api/payment/callback?order_no=ord_1',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await renderHarness();
    const button = rendered.container.querySelector('#stripe-start');

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/payment/checkout',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: 'starter',
          currency: 'USD',
          locale: 'en',
          payment_provider: '',
          metadata: {},
        }),
      })
    );
    expect(
      rendered.container.querySelector('#embedded-open')?.textContent
    ).toBe('open');
    expect(
      rendered.container.querySelector('#embedded-client-secret')?.textContent
    ).toBe('cs_test_client_secret');
    expect(
      rendered.container.querySelector('#embedded-result-url')?.textContent
    ).toBe('https://mogged.games/settings/payments');
    expect(
      rendered.container.querySelector('#embedded-callback-url')?.textContent
    ).toBe('https://mogged.games/api/payment/callback?order_no=ord_1');
    expect(locationAssignSpy).not.toHaveBeenCalled();

    await rendered.unmount();
  });

  it('keeps redirect providers on browser navigation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          message: 'ok',
          data: {
            provider: 'paypal',
            orderNo: 'ord_2',
            flow: 'redirect',
            sessionId: 'sess_2',
            checkoutUrl: 'https://paypal.example.com/checkout',
            paymentResultUrl: 'https://mogged.games/settings/payments',
          },
        }),
      })
    );

    const rendered = await renderHarness();
    const button = rendered.container.querySelector('#paypal-start');

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(locationAssignSpy).toHaveBeenCalledWith(
      'https://paypal.example.com/checkout'
    );
    expect(
      rendered.container.querySelector('#embedded-open')?.textContent
    ).toBe('closed');

    await rendered.unmount();
  });

  it('keeps the payment selector open when the embedded Stripe contract is incomplete', async () => {
    testMocks.appContext.configs = {
      select_payment_enabled: 'true',
      default_payment_provider: 'stripe',
      stripe_publishable_key: 'pk_test_123',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          message: 'ok',
          data: {
            provider: 'stripe',
            orderNo: 'ord_3',
            flow: 'embedded',
            sessionId: 'sess_3',
            paymentResultUrl: 'https://mogged.games/settings/payments',
          },
        }),
      })
    );

    const rendered = await renderHarness();
    const button = rendered.container.querySelector('#stripe-provider-start');

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testMocks.appContext.setIsShowPaymentModal).not.toHaveBeenCalled();
    expect(
      rendered.container.querySelector('#embedded-open')?.textContent
    ).toBe('closed');
    expect(toastErrorMock).toHaveBeenCalledWith(
      'checkout failed: embedded checkout client secret not found'
    );

    await rendered.unmount();
  });

  it('treats missing app configs as an empty config map instead of crashing the hook', async () => {
    testMocks.appContext.configs = undefined as unknown as Record<
      string,
      string
    >;

    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({
        code: 0,
        message: 'ok',
        data: {
          provider: 'stripe',
          orderNo: 'ord_4',
          flow: 'embedded',
          sessionId: 'sess_4',
          clientSecret: 'cs_test_missing_configs',
          paymentResultUrl: 'https://mogged.games/settings/payments',
          paymentCallbackUrl:
            'https://mogged.games/api/payment/callback?order_no=ord_4',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await renderHarness();
    const button = rendered.container.querySelector('#stripe-start');

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/payment/checkout',
      expect.objectContaining({
        body: JSON.stringify({
          product_id: 'starter',
          currency: 'USD',
          locale: 'en',
          payment_provider: '',
          metadata: {},
        }),
      })
    );
    expect(
      rendered.container.querySelector('#embedded-client-secret')?.textContent
    ).toBe('cs_test_missing_configs');

    await rendered.unmount();
  });

  it('routes embedded finalization through the callback bridge when the order is still processing', async () => {
    vi.useFakeTimers();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          message: 'ok',
          data: {
            provider: 'stripe',
            orderNo: 'ord_processing',
            flow: 'embedded',
            sessionId: 'sess_processing',
            clientSecret: 'cs_test_processing',
            paymentResultUrl: 'https://mogged.games/settings/payments',
            paymentCallbackUrl:
              'https://mogged.games/api/payment/callback?order_no=ord_processing',
          },
        }),
      })
      .mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          message: 'ok',
          data: {
            orderNo: 'ord_processing',
            status: 'created',
            paymentStatus: 'processing',
          },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await renderHarness();
    const startButton = rendered.container.querySelector('#stripe-start');
    const finalizeButton =
      rendered.container.querySelector('#finalize-embedded');

    await act(async () => {
      startButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      finalizeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.runAllTimersAsync();
    });

    expect(locationAssignSpy).toHaveBeenCalledWith(
      'https://mogged.games/api/payment/callback?order_no=ord_processing'
    );

    await rendered.unmount();
  });

  it('resumes an embedded checkout session from session storage after a Stripe redirect return', async () => {
    window.sessionStorage.setItem(
      'imageeditorai:stripe-embedded-checkout',
      JSON.stringify({
        clientSecret: 'cs_resume_123',
        orderNo: 'ord_resume',
        paymentResultUrl: 'https://mogged.games/settings/payments',
        paymentCallbackUrl:
          'https://mogged.games/api/payment/callback?order_no=ord_resume',
      })
    );

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        assign: locationAssignSpy,
        href: 'https://mogged.games/pricing?stripe_checkout_resume=1&order_no=ord_resume',
        search: '?stripe_checkout_resume=1&order_no=ord_resume',
        pathname: '/pricing',
        hash: '',
        origin: 'https://mogged.games',
      },
    });

    const replaceStateSpy = vi
      .spyOn(window.history, 'replaceState')
      .mockImplementation(() => undefined);

    const rendered = await renderHarness();

    expect(
      rendered.container.querySelector('#embedded-open')?.textContent
    ).toBe('open');
    expect(
      rendered.container.querySelector('#embedded-client-secret')?.textContent
    ).toBe('cs_resume_123');
    expect(replaceStateSpy).toHaveBeenCalled();

    await rendered.unmount();
  });
});
