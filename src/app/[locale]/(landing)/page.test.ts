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
      title: 'Getting Started',
      items: [
        {
          question: 'What is mogged?',
          answer:
            'mogged is a 1v1 face rating arena. You enable your camera, the AI scans your face, and you get matched against a random opponent. The AI compares both faces and declares a winner based on facial symmetry, canthal tilt, jawline definition, and other biometric traits.',
        },
        {
          question: 'Do I need an account to play?',
          answer:
            'You can try a guest battle without an account. Sign up to save your ELO, track progress, climb the leaderboard, and access premium features.',
        },
        {
          question: 'How does the AI rating work?',
          answer:
            'Our AI uses computer vision to analyze key facial biometrics: symmetry, canthal tilt (eye angle), jawline definition, facial thirds (forehead/midface/lower face proportions), and overall facial harmony. These combine into a 0-10 score.',
        },
        {
          question: 'How do rank tiers work?',
          answer:
            'Ranks are based on ELO: Molecule (0-800) to Sub3 (800-1000) to Low Tier Normie (1000-1200) to Mid Tier Normie (1200-1400) to High Tier Normie (1400-1600) to Chadlite (1600-1800) to Chad (1800-2000) to Slayer (2000+).',
        },
      ],
    },
    {
      title: 'Privacy & Fair Play',
      items: [
        {
          question: 'Is my face data stored?',
          answer:
            'Face scans are used for real-time battle scoring only. We do not store raw camera footage. Only your ELO rating and battle stats are saved to your account.',
        },
        {
          question: 'Can the AI be tricked?',
          answer:
            'The AI detects face presence and orientation. Covering the camera, extreme angles, or props may result in a failed scan. Fair play is enforced.',
        },
        {
          question: 'How is matchmaking fair?',
          answer:
            'Players are paired randomly. The ELO system ensures you gain more points for beating higher-ranked players and lose fewer points against stronger opponents.',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          question: 'How do I report an issue?',
          answer:
            'Email {{support_email}} for account help, battle issues, billing questions, or anything else you need.',
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
      title: "mogged | 1v1 Face Rating Battles - Get Mogged or Get Moggin'",
      description: 'Home description',
      keywords: 'mogged, mog battle, face rating, 1v1 mog, mogged game, mogging',
    },
    seoSections: {
      structured_data: {
        alternate_names: ['mogged', 'mog battle', 'face rating game', '1v1 mog'],
        about: ['mogged', 'mog battle', 'face rating', '1v1 arena', 'mogging'],
        feature_list: [
          '1v1 face rating mog battles',
          'AI-powered facial biometric analysis',
          'ELO ranking and leaderboard system',
          'Rank tiers from Molecule to Slayer',
          'Real-time matchmaking and battle results',
        ],
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
        },
      })
    );
    expect(getFaqSchemaQuestions).toHaveBeenCalledWith(landingFaq, {
      groupIndexes: [0, 1],
      maxItems: 5,
    });
    expect(getFAQPageSchema).toHaveBeenCalledWith({
      questions: [
        {
          question: 'What is mogged?',
          answer:
            'mogged is a 1v1 face rating arena. You enable your camera, the AI scans your face, and you get matched against a random opponent. The AI compares both faces and declares a winner based on facial symmetry, canthal tilt, jawline definition, and other biometric traits.',
        },
        {
          question: 'Do I need an account to play?',
          answer:
            'You can try a guest battle without an account. Sign up to save your ELO, track progress, climb the leaderboard, and access premium features.',
        },
        {
          question: 'How does the AI rating work?',
          answer:
            'Our AI uses computer vision to analyze key facial biometrics: symmetry, canthal tilt (eye angle), jawline definition, facial thirds (forehead/midface/lower face proportions), and overall facial harmony. These combine into a 0-10 score.',
        },
        {
          question: 'How do rank tiers work?',
          answer:
            'Ranks are based on ELO: Molecule (0-800) to Sub3 (800-1000) to Low Tier Normie (1000-1200) to Mid Tier Normie (1200-1400) to High Tier Normie (1400-1600) to Chadlite (1600-1800) to Chad (1800-2000) to Slayer (2000+).',
        },
        {
          question: 'Is my face data stored?',
          answer:
            'Face scans are used for real-time battle scoring only. We do not store raw camera footage. Only your ELO rating and battle stats are saved to your account.',
        },
      ],
    });

    await rendered.unmount();
  });
});
