// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LandingPage from './page';

const getFAQPageSchema = vi.hoisted(() =>
  vi.fn(() => ({ '@type': 'FAQPage' }))
);
const getFaqSchemaQuestions = vi.hoisted(() =>
  vi.fn(
    (
      faq: {
        categories?: Array<{
          items?: Array<{ question: string; answer: string }>;
        }>;
      },
      options?: { groupIndexes?: number[]; maxItems?: number }
    ) => {
      const groups = faq.categories ?? [];
      const items =
        options?.groupIndexes?.flatMap((index) => groups[index]?.items ?? []) ??
        [];

      return items.slice(0, options?.maxItems).map((item) => ({
        question: item.question,
        answer: item.answer,
      }));
    }
  )
);
const landingPageSpy = vi.hoisted(() => vi.fn());
const getGeneratorPricingPayload = vi.hoisted(() =>
  vi.fn(async () => ({
    pricing: {
      title: 'Pricing',
      description: 'Description',
      groups: [],
      items: [
        {
          title: 'Pro',
          description: 'Pro plan',
          currency: 'USD',
          amount: 20,
          interval: 'month',
          price: '$20',
          original_price: '',
          product_id: 'pro-monthly',
          button: { title: 'Upgrade', url: '/pricing' },
          credits: 1000,
          valid_days: 30,
          features: [],
        },
      ],
    },
    pageCopy: {
      current_plan: 'Current Plan',
      currency_selector: 'Currency',
      processing: 'Processing',
      snapshot_title: 'Snapshot',
      snapshot_credits: 'Credits',
      snapshot_credits_total_suffix: 'total',
      snapshot_credits_monthly_suffix: '/mo',
      snapshot_generation_speed: 'Speed',
      snapshot_text_to_image: 'Text to Image',
      snapshot_image_edit: 'Image Edit',
      snapshot_credit_cost: 'Cost',
      speed_standard: 'Standard',
      speed_priority: 'Priority',
      speed_fastest: 'Fastest',
    },
  }))
);

const landingFaq = {
  id: 'faq',
  title: 'mogged FAQ',
  categories: [
    {
      title: 'About mogged',
      items: [
        {
          question: 'What is mogged?',
          answer: 'The public product homepage.',
        },
        {
          question: 'What can I do with mogged?',
          answer:
            'Open the hosted AI image editor workspace and browser tools.',
        },
      ],
    },
    {
      title: 'Workflow Modes & Tools',
      items: [
        {
          question:
            'Does mogged support more than one image workflow?',
          answer: 'Yes. Text-to-image and image-to-image.',
        },
        {
          question:
            'When should I use the studio instead of the browser tools?',
          answer: 'Use the studio for generation and edits.',
        },
        {
          question: 'What browser tools ship with mogged?',
          answer: 'Conversion, compression, GIF export, and thumbnails.',
        },
        {
          question: 'Is mogged available in multiple languages?',
          answer: 'Yes. Nine public languages are available.',
        },
      ],
    },
    {
      title: 'Pricing, Trust & Support',
      items: [
        {
          question: 'How do I contact support?',
          answer: 'Email support@mogged.games.',
        },
      ],
    },
  ],
};

vi.mock('next-intl/server', () => ({
  getTranslations: async () => ({
    raw: () => ({}),
  }),
  setRequestLocale: vi.fn(),
}));

vi.mock('@/core/i18n/load-messages', () => ({
  loadMessages: async (path: string) => ({
    loaded: path,
  }),
}));

vi.mock('@/themes/default/pages/landing', () => ({
  default: (props: Record<string, any>) => {
    landingPageSpy(props);
    return createElement(
      'section',
      { 'data-slot': 'landing-page-core' },
      props.page?.faq?.title || 'Landing'
    );
  },
}));

vi.mock('@/config/locale', () => ({
  getLocaleBcp47: () => 'en-US',
  publicSiteLocales: ['en', 'zh'],
  resolveAppLocale: (locale: string) => locale,
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

vi.mock('@/shared/lib/brand', () => ({
  DEFAULT_PUBLIC_SEO_IMAGE: '/images/default-og.webp',
  getAppDomain: () => 'mogged.games',
  getAppName: () => 'mogged',
  getAppUrl: () => 'https://mogged.games',
  getSupportEmail: () => 'support@mogged.games',
}));

vi.mock('@/shared/lib/faq', () => ({
  getFaqSchemaQuestions,
}));

vi.mock('@/shared/lib/landing-page-content', () => ({
  buildLandingPageContent: () => ({
    metadata: {
      title: 'mogged | AI Image Editor & Photo Editor AI',
      description: 'Home description',
      keywords: 'image editor ai, ai image editor',
    },
    seoSections: {
      structured_data: {
        alternate_names: ['mogged'],
        about: ['AI image editor'],
        feature_list: ['ai image editor', 'text-to-image', 'image-to-image'],
      },
    },
    page: {
      faq: landingFaq,
    },
  }),
}));

vi.mock('@/shared/lib/schema', () => ({
  getFAQPageSchema,
}));

vi.mock('@/shared/services/generator-pricing', () => ({
  getGeneratorPricingPayload,
}));

vi.mock('@/shared/lib/seo', () => ({
  getLocalizedUrl: () => 'https://mogged.games',
  getMetadata: () => () => ({}),
}));

vi.mock('@/shared/lib/site-icons', () => ({
  SITE_LOGO_PATH: '/images/icons/logo.png',
}));

async function renderLandingRoute() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      await LandingPage({
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

describe('Landing route page', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    getFAQPageSchema.mockClear();
    getFaqSchemaQuestions.mockClear();
    getGeneratorPricingPayload.mockClear();
    landingPageSpy.mockClear();
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('limits homepage FAQPage schema to top workflow questions', async () => {
    const rendered = await renderLandingRoute();

    expect(rendered.container.textContent).toContain('mogged FAQ');
    expect(landingPageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        imageWorkspaceMessages: {
          common: {
            loaded: 'common',
          },
          ai: {
            image: {
              loaded: 'ai/image',
            },
          },
        },
        pricingPayload: expect.objectContaining({
          pricing: expect.objectContaining({
            title: 'Pricing',
          }),
        }),
      })
    );
    expect(getGeneratorPricingPayload).toHaveBeenCalledWith('en');
    expect(getFaqSchemaQuestions).toHaveBeenCalledWith(landingFaq, {
      groupIndexes: [0, 1],
      maxItems: 5,
    });
    expect(getFAQPageSchema).toHaveBeenCalledWith({
      questions: [
        {
          question: 'What is mogged?',
          answer: 'The public product homepage.',
        },
        {
          question: 'What can I do with mogged?',
          answer:
            'Open the hosted AI image editor workspace and browser tools.',
        },
        {
          question:
            'Does mogged support more than one image workflow?',
          answer: 'Yes. Text-to-image and image-to-image.',
        },
        {
          question:
            'When should I use the studio instead of the browser tools?',
          answer: 'Use the studio for generation and edits.',
        },
        {
          question: 'What browser tools ship with mogged?',
          answer: 'Conversion, compression, GIF export, and thumbnails.',
        },
      ],
    });

    await rendered.unmount();
  });
});
