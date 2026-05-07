// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PricingPageCopy } from '@/shared/types/blocks/pricing';
import { Pricing } from '@/themes/default/blocks/pricing';

let currentLocale = 'en';
const testMocks = vi.hoisted(() => ({
  appContext: {
    user: null as any,
    setIsShowSignModal: vi.fn(),
    setIsShowPaymentModal: vi.fn(),
    configs: {} as Record<string, string>,
  },
  googleAds: {
    resolveGoogleAdsConfigs: vi.fn(() => ({})),
    trackGoogleAdsConversion: vi.fn(),
  },
}));

const pageTranslations: PricingPageCopy = {
  current_plan: 'Current Plan',
  currency_selector: 'Currency',
  processing: 'Processing',
  snapshot_title: 'Plan Snapshot',
  snapshot_credits: 'Credits',
  snapshot_credits_total_suffix: 'total',
  snapshot_credits_monthly_suffix: '/ mo',
  snapshot_generation_speed: 'Generation speed',
  snapshot_text_to_image: '1K image generation',
  snapshot_image_edit: '2K image edit',
  snapshot_credit_cost: '{credits} credits',
  metric_cost_per_100_credits: 'Cost per 100 credits',
  speed_standard: 'Standard',
  speed_priority: 'Priority',
  speed_fastest: 'Fastest',
};

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) =>
    createElement('a', { href, ...props }, children),
}));

vi.mock('next-intl', () => ({
  useLocale: () => currentLocale,
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const source: Record<string, string> =
        namespace === 'pricing.page'
          ? (pageTranslations as unknown as Record<string, string>)
          : {};
      const template = source[key] || key;
      return template.replace(
        /\{\{(.*?)\}\}/g,
        (_match: string, token: string) =>
          String(values?.[token.trim()] ?? `{{${token}}}`)
      );
    },
}));
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
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

vi.mock('@/shared/blocks/payment/payment-modal', () => ({
  PaymentModal: () => createElement('div', { 'data-slot': 'payment-modal' }),
}));

async function renderPricing() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(Pricing, {
        pageCopy: pageTranslations,
        pricing: {
          id: 'pricing',
          title: 'Pricing',
          description:
            'Choose the plan that matches how often you use the hosted workspace.',
          groups: [{ name: 'annual', title: 'Annually', is_featured: true }],
          items: [
            {
              product_id: 'pro-yearly',
              title: 'Pro',
              label: 'Regular Use',
              description: 'Billed $1,188 yearly',
              currency: 'USD',
              amount: 118800,
              price: '$99',
              original_price: '$297',
              interval: 'year',
              display_credits: 2000,
              display_credits_interval: 'month',
              credits: 24000,
              features_title: '',
              features: [
                'Text-to-image and image-to-image workflows',
                'Prompt-led generation and source-image edits',
                'High-resolution image exports',
                'Skip the free queue on hosted image jobs',
                'No watermark',
                'Commercial use license',
                'Priority customer support',
              ],
              button: { title: 'Get Started', url: '/pricing' },
              group: 'annual',
              tip: '2,000 Credits / month on annual billing',
            },
          ],
        },
      })
    );
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

async function renderPricingComparison() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(Pricing, {
        pageCopy: pageTranslations,
        pricing: {
          id: 'pricing',
          title: 'Pricing',
          description: 'Compare plans.',
          groups: [{ name: 'annual', title: 'Annually', is_featured: true }],
          items: [
            {
              product_id: 'try-yearly',
              title: 'Try',
              label: 'Start Small',
              description: 'Billed $348 yearly',
              currency: 'USD',
              amount: 34800,
              price: '$29',
              original_price: '$87',
              interval: 'year',
              display_credits: 500,
              display_credits_interval: 'month',
              credits: 6000,
              features_title: '',
              features: [
                'Text-to-image and image-to-image workflows',
                'Prompt-led generation and source-image edits',
                'High-resolution image exports',
                'No watermark',
                'Commercial use license',
                'Customer support',
              ],
              button: { title: 'Get Started', url: '/pricing' },
              group: 'annual',
              tip: '500 Credits / month on annual billing',
            },
            {
              product_id: 'max-yearly',
              title: 'Max',
              label: 'Best Value',
              description: 'Billed $2,388 yearly',
              currency: 'USD',
              amount: 238800,
              price: '$199',
              original_price: '$597',
              interval: 'year',
              display_credits: 8000,
              display_credits_interval: 'month',
              credits: 96000,
              is_featured: true,
              features_title: '',
              features: [
                'Text-to-image and image-to-image workflows',
                'Prompt-led generation and source-image edits',
                'High-resolution image exports',
                'Skip the free queue on hosted image jobs',
                'Fastest generation speed',
                'No watermark',
                'Commercial use license',
                'Expert team support',
              ],
              button: { title: 'Get Started', url: '/pricing' },
              group: 'annual',
              tip: '8,000 Credits / month on annual billing',
            },
            {
              product_id: 'pro-yearly',
              title: 'Pro',
              label: 'Regular Use',
              description: 'Billed $1,188 yearly',
              currency: 'USD',
              amount: 118800,
              price: '$99',
              original_price: '$297',
              interval: 'year',
              display_credits: 2000,
              display_credits_interval: 'month',
              credits: 24000,
              features_title: '',
              features: [
                'Text-to-image and image-to-image workflows',
                'Prompt-led generation and source-image edits',
                'High-resolution image exports',
                'Skip the free queue on hosted image jobs',
                'No watermark',
                'Commercial use license',
                'Priority customer support',
              ],
              button: { title: 'Get Started', url: '/pricing' },
              group: 'annual',
              tip: '2,000 Credits / month on annual billing',
            },
          ],
        },
      })
    );
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

describe('Pricing block', () => {
  beforeEach(() => {
    currentLocale = 'en';
    testMocks.appContext.user = null;
    testMocks.appContext.configs = {};
    testMocks.appContext.setIsShowSignModal.mockReset();
    testMocks.appContext.setIsShowPaymentModal.mockReset();
    testMocks.googleAds.resolveGoogleAdsConfigs.mockReset();
    testMocks.googleAds.resolveGoogleAdsConfigs.mockReturnValue({
      enabled: true,
      purchaseTrackingMode: 'browser',
      conversionId: '',
      beginCheckoutLabel: '',
      purchaseLabel: '',
      signupLabel: '',
    });
    testMocks.googleAds.trackGoogleAdsConversion.mockReset();
    vi.restoreAllMocks();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('uses tightened public-page top spacing instead of oversized symmetric padding', async () => {
    const rendered = await renderPricing();
    const section = rendered.container.querySelector('section');
    const headingBlock = section?.firstElementChild;
    const heading = rendered.container.querySelector('h1');

    expect(section?.className).toContain(
      'pt-[var(--landing-page-top-space-mobile)]'
    );
    expect(section?.className).toContain('pb-12');
    expect(section?.className).toContain(
      'md:pt-[var(--landing-page-top-space)]'
    );
    expect(section?.className).toContain('md:pb-16');
    expect(section?.className).not.toContain('py-24');
    expect(section?.className).not.toContain('md:py-36');
    expect(headingBlock?.className).toContain('mb-6');
    expect(headingBlock?.className).toContain('md:mb-8');
    expect(headingBlock?.className).not.toContain('mb-10');
    expect(headingBlock?.className).not.toContain('md:mb-12');
    expect(heading?.textContent).toBe('Pricing');

    await rendered.unmount();
  });

  it('renders shared pricing summary and snapshot modules for every visible card', async () => {
    const rendered = await renderPricing();
    const metrics = rendered.container.querySelector(
      '[data-testid="pricing-metrics"]'
    );
    const snapshot = rendered.container.querySelector(
      '[data-testid="pricing-snapshot"]'
    );

    expect(metrics).toBeNull();
    expect(snapshot).not.toBeNull();
    expect(rendered.container.textContent).toContain('Plan Snapshot');
    expect(rendered.container.textContent).toContain('2,000 / mo');
    expect(rendered.container.textContent).toContain('Priority');
    expect(rendered.container.textContent).toContain('1K image generation');
    expect(rendered.container.textContent).toContain('2K image edit');
    expect(rendered.container.textContent).toContain('5 credits');
    expect(rendered.container.textContent).toContain('10 credits');
    expect(rendered.container.textContent).not.toContain('limited_time_badge');

    await rendered.unmount();
  });

  it('removes the standalone value metric card and relies on price plus feature bullets', async () => {
    const rendered = await renderPricing();
    const metrics = rendered.container.querySelector(
      '[data-testid="pricing-metrics"]'
    );

    expect(metrics).toBeNull();
    expect(rendered.container.textContent).not.toContain(
      'Cost per 100 credits'
    );
    expect(rendered.container.textContent).not.toContain('Includes');
    expect(rendered.container.textContent).not.toContain(
      'Everything in Try, plus'
    );
    expect(rendered.container.textContent).not.toContain(
      'Everything in Pro, plus'
    );
    expect(rendered.container.textContent).not.toContain(
      'Lifetime feature updates'
    );
    expect(rendered.container.textContent).toContain(
      'Text-to-image and image-to-image workflows'
    );
    expect(rendered.container.textContent).toContain(
      'Priority customer support'
    );

    await rendered.unmount();
  });

  it('gives the featured pricing card a stronger visual hierarchy than neighboring plans', async () => {
    const rendered = await renderPricingComparison();
    const cards = rendered.container.querySelectorAll(
      '[data-slot="pricing-plan-card"]'
    );
    const featuredCard = rendered.container.querySelector(
      '[data-slot="pricing-plan-card"][data-featured="true"]'
    );
    const featuredAccent = rendered.container.querySelector(
      '[data-slot="pricing-featured-accent"]'
    );

    expect(cards).toHaveLength(3);
    expect(featuredCard?.className).toContain('md:-translate-y-2');
    expect(featuredCard?.className).toContain('bg-linear-to-b');
    expect(featuredCard?.className).toContain('shadow-lg');
    expect(featuredAccent).not.toBeNull();

    await rendered.unmount();
  });

  it('formats snapshot numbers with locale-aware separators outside en and zh', async () => {
    currentLocale = 'de';
    const rendered = await renderPricing();

    expect(rendered.container.textContent).toContain('2.000 / mo');

    await rendered.unmount();
  });

  it('normalizes begin_checkout values into major currency units before tracking', async () => {
    testMocks.appContext.user = {
      id: 'user_1',
      email: 'demo@example.com',
    };
    testMocks.appContext.configs = {
      select_payment_enabled: 'false',
      default_payment_provider: 'stripe',
      google_ads_conversion_id: 'AW-1234567890',
      google_ads_begin_checkout_label: 'beginCheckoutLabel',
    };
    testMocks.googleAds.resolveGoogleAdsConfigs.mockReturnValue({
      enabled: true,
      purchaseTrackingMode: 'browser',
      conversionId: 'AW-1234567890',
      beginCheckoutLabel: 'beginCheckoutLabel',
      purchaseLabel: '',
      signupLabel: '',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          message: 'ok',
          data: {
            checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123',
          },
        }),
      })
    );

    const rendered = await renderPricing();
    const button = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((element) => element.textContent?.includes('Get Started'));

    await act(async () => {
      button?.click();
    });

    expect(testMocks.googleAds.trackGoogleAdsConversion).toHaveBeenCalledWith({
      conversionId: 'AW-1234567890',
      label: 'beginCheckoutLabel',
      value: 1188,
      currency: 'USD',
    });

    await rendered.unmount();
  });

  it('waits for a successful checkout session before tracking begin_checkout', async () => {
    testMocks.appContext.user = {
      id: 'user_1',
      email: 'demo@example.com',
    };
    testMocks.appContext.configs = {
      select_payment_enabled: 'false',
      default_payment_provider: 'stripe',
      google_ads_conversion_id: 'AW-1234567890',
      google_ads_begin_checkout_label: 'beginCheckoutLabel',
    };
    testMocks.googleAds.resolveGoogleAdsConfigs.mockReturnValue({
      enabled: true,
      purchaseTrackingMode: 'browser',
      conversionId: 'AW-1234567890',
      beginCheckoutLabel: 'beginCheckoutLabel',
      purchaseLabel: '',
      signupLabel: '',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
      })
    );

    const rendered = await renderPricing();
    const button = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((element) => element.textContent?.includes('Get Started'));

    await act(async () => {
      button?.click();
    });

    expect(testMocks.googleAds.trackGoogleAdsConversion).not.toHaveBeenCalled();

    await rendered.unmount();
  });

  it('does not track begin_checkout when ads tracking is disabled', async () => {
    testMocks.appContext.user = {
      id: 'user_1',
      email: 'demo@example.com',
    };
    testMocks.appContext.configs = {
      select_payment_enabled: 'false',
      default_payment_provider: 'stripe',
      enable_ads_tracking: 'false',
      google_ads_conversion_id: 'AW-1234567890',
      google_ads_begin_checkout_label: 'beginCheckoutLabel',
    };
    testMocks.googleAds.resolveGoogleAdsConfigs.mockReturnValue({
      enabled: false,
      purchaseTrackingMode: 'browser',
      conversionId: 'AW-1234567890',
      beginCheckoutLabel: 'beginCheckoutLabel',
      purchaseLabel: '',
      signupLabel: '',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          message: 'ok',
          data: {
            checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_456',
          },
        }),
      })
    );

    const rendered = await renderPricing();
    const button = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((element) => element.textContent?.includes('Get Started'));

    await act(async () => {
      button?.click();
    });

    expect(testMocks.googleAds.trackGoogleAdsConversion).not.toHaveBeenCalled();

    await rendered.unmount();
  });
});
