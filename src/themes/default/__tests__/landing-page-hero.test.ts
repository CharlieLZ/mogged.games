// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import enLanding from '@/config/locale/messages/en/landing.json';
import type { GeneratorPricingPayload } from '@/shared/blocks/generator/generator-pricing-payload';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';
import LandingPage from '@/themes/default/pages/landing';

const imageWorkspaceSpy = vi.fn();
const benefitsReviewCarouselSpy = vi.fn();
const featuresSpy = vi.fn();
const gptImageComparisonShowcaseSpy = vi.fn();
const nanoImageGalleryShowcaseSpy = vi.fn();
const nanoBananaCasesSpy = vi.fn();
const pageHeaderSpy = vi.fn();
const replacePsShowcaseSpy = vi.fn();
const useCasesShowcaseSpy = vi.fn();
const pricingPayload: GeneratorPricingPayload = {
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
};

vi.mock('@/themes/default/blocks/landing-image-workspace-shell', () => ({
  LandingImageWorkspaceShell: (props: Record<string, unknown>) => {
    imageWorkspaceSpy(props);
    return createElement('div', { 'data-slot': 'image-workspace' });
  },
}));

vi.mock('@/themes/default/blocks/landing-r2-video-showcase-shell', () => ({
  LandingR2VideoShowcaseShell: () =>
    createElement('section', null, 'See what mogged can create'),
}));

vi.mock('@/themes/default/blocks/gpt-image-comparison-showcase', () => ({
  GptImageComparisonShowcase: (props: Record<string, unknown>) => {
    gptImageComparisonShowcaseSpy(props);
    return createElement(
      'section',
      { 'data-slot': 'gpt-image-comparison-showcase' },
      'GPT Image 2 vs Nano Banana Pro'
    );
  },
}));

vi.mock('@/shared/blocks/generator/nano-image-gallery-showcase', () => ({
  NanoImageGalleryShowcase: (props: Record<string, unknown>) => {
    nanoImageGalleryShowcaseSpy(props);
    return createElement(
      'section',
      { 'data-slot': 'image-generator-gallery' },
      'See What mogged Can Generate'
    );
  },
}));

vi.mock('@/themes/default/blocks/nano-banana-cases', () => ({
  NanoBananaCases: (props: Record<string, unknown>) => {
    nanoBananaCasesSpy(props);
    return createElement(
      'section',
      { 'data-slot': 'nano-banana-cases' },
      'Typical use cases of Nano Banana'
    );
  },
}));

vi.mock('@/themes/default/blocks/replace-ps-showcase', () => ({
  ReplacePsShowcase: (props: Record<string, unknown>) => {
    replacePsShowcaseSpy(props);
    return createElement(
      'section',
      { 'data-slot': 'replace-ps-showcase' },
      'Skip the traditional Photoshop workflow'
    );
  },
}));

vi.mock('@/themes/default/blocks/benefits-review-carousel-shell', () => ({
  BenefitsReviewCarouselShell: (props: Record<string, unknown>) => {
    benefitsReviewCarouselSpy(props);
    return createElement('section', null, 'Real creations. Real feedback.');
  },
}));

vi.mock('@/shared/components/ui/animated-grid-pattern', () => ({
  AnimatedGridPattern: () => null,
}));

vi.mock('@/shared/blocks/common/page-header', () => ({
  PageHeader: (props: Record<string, unknown>) => {
    pageHeaderSpy(props);
    return createElement(
      'section',
      {
        'data-slot': 'page-header',
        'data-size': String(props.size || ''),
      },
      createElement('h1', null, String(props.title || '')),
      createElement('p', null, String(props.description || ''))
    );
  },
}));

vi.mock('@/shared/components/ui/highlighter', () => ({
  Highlighter: ({ children }: { children: React.ReactNode }) =>
    createElement('span', null, children),
}));

vi.mock('@/themes/default/blocks/cta', () => ({
  CTA: () => null,
}));

vi.mock('@/themes/default/blocks/home-final-cta', () => ({
  HomeFinalCTA: () => null,
}));

vi.mock('@/themes/default/blocks/faq', () => ({
  FAQ: (props: Record<string, unknown>) =>
    createElement(
      'section',
      null,
      (props.faq as { title?: string })?.title || 'FAQ'
    ),
}));

vi.mock('@/themes/default/blocks/features', () => ({
  Features: (props: Record<string, unknown>) => {
    featuresSpy(props);
    return createElement(
      'section',
      { 'data-slot': 'features-section' },
      (props.features as { title?: string })?.title || 'Features'
    );
  },
}));

vi.mock('@/themes/default/blocks/features-list', () => ({
  FeaturesList: () => null,
}));

vi.mock('@/themes/default/blocks/features-step', () => ({
  FeaturesStep: (props: Record<string, unknown>) =>
    createElement(
      'section',
      null,
      (props.features as { title?: string })?.title || 'How it works'
    ),
}));

vi.mock('@/themes/default/blocks/gallery-showcase', () => ({
  GalleryShowcase: (props: Record<string, unknown>) =>
    createElement(
      'section',
      null,
      (props.gallery as { title?: string })?.title || 'Gallery'
    ),
}));

vi.mock('@/shared/blocks/generator/use-cases-showcase', () => ({
  UseCasesShowcase: (props: Record<string, unknown>) => {
    useCasesShowcaseSpy(props);
    return createElement(
      'section',
      { 'data-slot': 'image-generator-use-cases' },
      'What mogged Can Edit Fast'
    );
  },
}));

async function renderLandingHero() {
  const container = document.createElement('div');
  const root = createRoot(container);
  const page = {
    hero: replaceBrandTokensDeep({
      ...enLanding.hero,
      comparison_video: {
        label: 'mogged comparison video',
      },
    }),
    benefits: {
      id: 'benefits',
      title: 'Real creations. Real feedback.',
      items: [
        {
          title: 'James Carter',
          quote: 'Our team is small.',
        },
      ],
    },
    usage: {
      id: 'usage',
      title: 'Why it works',
      items: [],
    },
    features: {
      id: 'features',
      title: 'An AI image editor built for fast, usable changes',
      items: [],
    },
    nano_banana_cases: {
      id: 'nano-banana-cases',
      title: 'Typical use cases of Nano Banana',
      items: [
        {
          id: 'ecommerce-product-promotional-image',
          title: 'E-commerce product promotional image',
        },
      ],
    },
    faq: {
      id: 'faq',
      title: 'FAQ',
      items: [],
    },
  };

  await act(async () => {
    root.render(await LandingPage({ locale: 'en', page, pricingPayload }));
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

describe('Landing page hero', () => {
  beforeEach(() => {
    imageWorkspaceSpy.mockClear();
    benefitsReviewCarouselSpy.mockClear();
    featuresSpy.mockClear();
    gptImageComparisonShowcaseSpy.mockClear();
    nanoImageGalleryShowcaseSpy.mockClear();
    nanoBananaCasesSpy.mockClear();
    pageHeaderSpy.mockClear();
    replacePsShowcaseSpy.mockClear();
    useCasesShowcaseSpy.mockClear();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders the homepage image generator without the removed video intro and showcase', async () => {
    const rendered = await renderLandingHero();
    const header = rendered.container.querySelector('[data-slot="page-header"]');
    const workspace = rendered.container.querySelector(
      '[data-slot="image-workspace"]'
    );
    const imageBackdrop = rendered.container.querySelector(
      '[style*="background-image"]'
    );
    const heroBackgroundVideos = rendered.container.querySelectorAll(
      '[data-slot="landing-hero-background-video"]'
    );
    const comparisonIntro = rendered.container.querySelector(
      '[data-slot="comparison-video-intro"]'
    );
    const comparisonLabel = rendered.container.querySelector(
      '[data-slot="comparison-video-label"]'
    );
    const comparisonVideo = rendered.container.querySelector('video');

    expect(header?.getAttribute('data-size')).toBe('compact');
    expect(header?.textContent).toContain('Free AI Image Editor Online');
    expect(header?.textContent).toContain(
      'Edit images, refine photos, create text-to-image concepts, and run image-to-image changes with mogged in one online image editor.'
    );
    expect(workspace?.closest('.max-w-6xl')).toBeNull();
    expect(rendered.container.textContent).toContain(
      'Edit images, refine photos, create text-to-image concepts, and run image-to-image changes with mogged in one online image editor.'
    );
    expect(imageBackdrop).toBeNull();
    expect(heroBackgroundVideos).toHaveLength(0);
    expect(comparisonIntro).toBeNull();
    expect(comparisonLabel).toBeNull();
    expect(comparisonVideo).toBeNull();
    expect(imageWorkspaceSpy).toHaveBeenCalledTimes(1);
    expect(imageWorkspaceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        pricingPayload: expect.objectContaining({
          pricing: expect.objectContaining({
            title: 'Pricing',
          }),
        }),
        srOnlyTitle: 'Free AI Image Editor Online',
      })
    );
    expect(pageHeaderSpy).toHaveBeenCalledTimes(1);
    expect(pageHeaderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Free AI Image Editor Online',
        description:
          'Edit images, refine photos, create text-to-image concepts, and run image-to-image changes with mogged in one online image editor.',
        size: 'compact',
      })
    );
    expect(nanoImageGalleryShowcaseSpy).toHaveBeenCalledTimes(1);
    expect(featuresSpy).toHaveBeenCalledTimes(1);
    expect(featuresSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        features: expect.objectContaining({
          id: 'features',
        }),
      })
    );
    expect(useCasesShowcaseSpy).toHaveBeenCalledTimes(1);
    expect(benefitsReviewCarouselSpy).not.toHaveBeenCalled();
    expect(replacePsShowcaseSpy).toHaveBeenCalledTimes(1);
    expect(replacePsShowcaseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en',
      })
    );
    expect(gptImageComparisonShowcaseSpy).toHaveBeenCalledTimes(1);
    expect(gptImageComparisonShowcaseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en',
      })
    );
    expect(nanoBananaCasesSpy).toHaveBeenCalledTimes(1);
    expect(nanoBananaCasesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cases: expect.objectContaining({
          id: 'nano-banana-cases',
        }),
      })
    );
    expect(rendered.container.textContent).toContain(
      'See What mogged Can Generate'
    );
    expect(rendered.container.textContent).toContain(
      'An AI image editor built for fast, usable changes'
    );
    expect(rendered.container.textContent).toContain(
      'What mogged Can Edit Fast'
    );
    expect(rendered.container.textContent).toContain(
      'Skip the traditional Photoshop workflow'
    );
    expect(rendered.container.textContent).toContain(
      'GPT Image 2 vs Nano Banana Pro'
    );
    expect(rendered.container.textContent).toContain(
      'Typical use cases of Nano Banana'
    );
    expect(rendered.container.textContent).not.toContain(
      'Real creations. Real feedback.'
    );
    expect(rendered.container.textContent).not.toContain(
      'Use mogged on mogged.games'
    );
    expect(rendered.container.textContent).not.toContain(
      'mogged comparison video'
    );
    expect(rendered.container.textContent).not.toContain(
      'See what mogged can create'
    );
    expect(rendered.container.textContent).not.toContain(
      'Motion-first examples pulled from the latest mogged showcase library.'
    );
    const galleryIndex =
      rendered.container.textContent?.indexOf(
        'See What mogged Can Generate'
      ) ?? -1;
    const featuresIndex =
      rendered.container.textContent?.indexOf(
        'An AI image editor built for fast, usable changes'
      ) ?? -1;
    const useCasesIndex =
      rendered.container.textContent?.indexOf(
        'What mogged Can Edit Fast'
      ) ?? -1;
    const replacePsIndex =
      rendered.container.textContent?.indexOf(
        'Skip the traditional Photoshop workflow'
      ) ??
      -1;
    const usageIndex =
      rendered.container.textContent?.indexOf('Why it works') ?? -1;
    const gptIndex =
      rendered.container.textContent?.indexOf(
        'GPT Image 2 vs Nano Banana Pro'
      ) ?? -1;
    const nanoBananaIndex =
      rendered.container.textContent?.indexOf(
        'Typical use cases of Nano Banana'
      ) ?? -1;
    const faqIndex = rendered.container.textContent?.indexOf('FAQ') ?? -1;

    expect(galleryIndex).toBeGreaterThanOrEqual(0);
    expect(featuresIndex).toBeGreaterThanOrEqual(0);
    expect(useCasesIndex).toBeGreaterThanOrEqual(0);
    expect(replacePsIndex).toBeGreaterThanOrEqual(0);
    expect(usageIndex).toBeGreaterThanOrEqual(0);
    expect(gptIndex).toBeGreaterThanOrEqual(0);
    expect(nanoBananaIndex).toBeGreaterThanOrEqual(0);
    expect(faqIndex).toBeGreaterThanOrEqual(0);
    expect(galleryIndex).toBeLessThan(useCasesIndex);
    expect(useCasesIndex).toBeLessThan(featuresIndex);
    expect(useCasesIndex).toBeLessThan(replacePsIndex);
    expect(replacePsIndex).toBeLessThan(usageIndex);
    expect(usageIndex).toBeLessThan(gptIndex);
    expect(gptIndex).toBeLessThan(nanoBananaIndex);
    expect(nanoBananaIndex).toBeLessThan(faqIndex);
    expect(usageIndex).toBeLessThan(faqIndex);

    await rendered.unmount();
  });
});
