// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PricingRoutePage from './page';

const {
  capturedFaq,
  getFAQPageSchema,
  getProductSchema,
  getWebApplicationSchema,
} = vi.hoisted(() => ({
  capturedFaq: { current: null as Record<string, any> | null },
  getFAQPageSchema: vi.fn(() => ({ '@type': 'FAQPage' })),
  getProductSchema: vi.fn(() => ({ '@type': 'Product' })),
  getWebApplicationSchema: vi.fn(() => ({ '@type': 'WebApplication' })),
}));

const landingMessages = {
  faq: {
    id: 'faq',
    title: 'Landing FAQ',
    categories: [
      {
        title: 'About mogged',
        items: [
          {
            question: 'What is mogged?',
            answer: 'The public homepage and hosted workspace.',
          },
        ],
      },
    ],
  },
  testimonials: {
    id: 'testimonials',
    title: 'What visitors usually want answered first',
    items: [],
  },
};

const pricingMessages = {
  faq: {
    id: 'faq',
    title: 'Pricing FAQ',
    categories: [
      {
        title: 'Pricing & Credits',
        items: [
          {
            question: 'Do browser tools consume credits?',
            answer: 'No. Browser tools stay local and free.',
          },
        ],
      },
    ],
  },
  page: {
    current_plan: 'Current Plan',
    processing: 'Processing',
    metric_cost_per_100_credits: 'Cost per 100 credits',
    snapshot_title: 'Plan Snapshot',
    snapshot_credits: 'Credits',
    snapshot_credits_total_suffix: 'total',
    snapshot_credits_monthly_suffix: '/ mo',
    snapshot_generation_speed: 'Generation speed',
    snapshot_text_to_image: '1K image generation',
    snapshot_image_edit: '2K image edit',
    snapshot_credit_cost: '{credits} credits',
    speed_standard: 'Standard',
    speed_priority: 'Priority',
    speed_fastest: 'Fastest',
  },
  seo_sections: {
    not_configured: 'Not configured',
    support_fallback: 'Email support',
    narrative: {
      title: 'How To Read mogged Pricing Here',
      description: 'Narrative description',
      paragraphs: ['First paragraph'],
    },
    comparison: {
      title: 'Plan Comparison',
      description: 'Comparison description',
      item_label: 'Item',
      rows: {
        one_time: 'One-time',
        monthly: 'Monthly',
        yearly: 'Yearly',
        support: 'Support',
      },
    },
    rules: {
      items: [
        {
          title: 'Credit Rules',
          description: 'Rule description',
        },
      ],
    },
    policy_links: {
      title: 'Read These Trust Pages Before Checkout',
      description: 'Policy links description',
      items: [
        {
          title: 'Refund Policy',
          description: 'Refund description',
          href: '/refund-policy',
        },
      ],
    },
    schema: {
      product_disclaimer: 'Disclaimer',
      product_keywords: ['mogged pricing'],
      webpage_name: 'mogged Pricing',
      webpage_description: 'Pricing page description',
    },
  },
};

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => ({
    raw: (key: string) =>
      namespace === 'landing'
        ? (landingMessages as Record<string, unknown>)[key]
        : (pricingMessages as Record<string, unknown>)[key],
  }),
  setRequestLocale: vi.fn(),
}));

vi.mock('@/themes/default/pages/pricing', () => ({
  default: ({ faq, pricingPageCopy }: Record<string, any>) => {
    capturedFaq.current = faq;

    return createElement(
      'section',
      { 'data-slot': 'pricing-page-core' },
      faq?.title || pricingPageCopy?.metric_credits || 'Pricing core'
    );
  },
}));

vi.mock('@/config/website/public-page-metadata', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/config/website/public-page-metadata')
    >();

  return {
    ...actual,
    getPublicPageLastModified: () => new Date('2026-04-11T00:00:00.000Z'),
  };
});

vi.mock('@/shared/components/ui/card', () => ({
  Card: ({ children }: Record<string, any>) =>
    createElement('div', null, children),
  CardContent: ({ children }: Record<string, any>) =>
    createElement('div', null, children),
  CardHeader: ({ children }: Record<string, any>) =>
    createElement('div', null, children),
  CardTitle: ({ children }: Record<string, any>) =>
    createElement('div', null, children),
}));

vi.mock('@/shared/lib/brand', () => ({
  DEFAULT_PUBLIC_SEO_IMAGE: '/images/default-og.webp',
  getAppName: () => 'mogged',
  replaceBrandTokensDeep: <T>(value: T) => value,
}));

vi.mock('@/shared/lib/presale', () => ({
  mergeFaqSections: ({
    primary,
    secondary,
    overrides,
  }: Record<string, any>) => ({
    ...primary,
    ...secondary,
    ...overrides,
    categories: [
      ...(primary?.categories ?? []),
      ...(secondary?.categories ?? []),
    ],
  }),
}));

vi.mock('@/shared/lib/schema', () => ({
  getFAQPageSchema,
  getProductSchema,
  getWebApplicationSchema,
}));

vi.mock('@/shared/lib/seo', () => ({
  getLocalizedUrl: () => 'https://mogged.games/pricing',
  getMetadata: () => () => ({}),
}));

vi.mock('@/shared/models/subscription', () => ({
  getCurrentSubscription: vi.fn(),
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: async () => null,
}));

vi.mock('@/shared/services/pricing', () => ({
  getLocalizedPricing: async () => ({
    items: [
      {
        product_id: 'try-yearly',
        title: 'Try',
        label: 'For Testing',
        description: 'Billed yearly',
        features: ['3600 credits'],
        amount: 2400,
        currency: 'USD',
        interval: 'year',
        group: 'yearly',
      },
    ],
    groups: [{ name: 'yearly', title: 'Yearly' }],
  }),
}));

async function renderPricingRoute() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      await PricingRoutePage({
        params: Promise.resolve({ locale: 'en' }),
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

describe('Pricing route page', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    getFAQPageSchema.mockClear();
    getProductSchema.mockClear();
    getWebApplicationSchema.mockClear();
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders the pricing page without legacy narrative, comparison, rules, or policy link sections', async () => {
    const rendered = await renderPricingRoute();

    expect(rendered.container.textContent).toContain('Pricing FAQ');
    expect(rendered.container.textContent).not.toContain(
      'How To Read mogged Pricing Here'
    );
    expect(rendered.container.textContent).not.toContain('Plan Comparison');
    expect(rendered.container.textContent).not.toContain('Credit Rules');
    expect(rendered.container.textContent).not.toContain(
      'Read These Trust Pages Before Checkout'
    );

    await rendered.unmount();
  });

  it('flattens grouped faq items when building FAQPage schema', async () => {
    const rendered = await renderPricingRoute();

    expect(getFAQPageSchema).toHaveBeenCalledWith({
      questions: [
        {
          question: 'Do browser tools consume credits?',
          answer: 'No. Browser tools stay local and free.',
        },
      ],
    });

    await rendered.unmount();
  });

  it('keeps the pricing page faq focused on billing questions instead of merging landing faq groups', async () => {
    const rendered = await renderPricingRoute();

    expect(capturedFaq.current?.title).toBe('Pricing FAQ');
    expect(capturedFaq.current?.categories).toEqual([
      {
        title: 'Pricing & Credits',
        items: [
          {
            question: 'Do browser tools consume credits?',
            answer: 'No. Browser tools stay local and free.',
          },
        ],
      },
    ]);

    await rendered.unmount();
  });

  it('does not emit a misleading single-product schema for the multi-plan pricing page', async () => {
    const rendered = await renderPricingRoute();

    expect(getProductSchema).not.toHaveBeenCalled();

    await rendered.unmount();
  });

  it('emits a pricing web application schema with offer data from pricing plans', async () => {
    const rendered = await renderPricingRoute();

    expect(getWebApplicationSchema).toHaveBeenCalledWith({
      name: 'mogged',
      description: 'Pricing page description',
      url: 'https://mogged.games/pricing',
      screenshot: '/images/default-og.webp',
      offers: [
        {
          name: 'Try',
          price: '24',
          priceCurrency: 'USD',
          url: 'https://mogged.games/pricing#pricing',
          category: 'yearly',
        },
      ],
    });

    await rendered.unmount();
  });
});
