import { describe, expect, it, vi } from 'vitest';

import { buildLandingPageContent } from './landing-page-content';

vi.mock('@/shared/lib/home-gallery', () => ({
  getHomeGalleryItems: () => [],
}));

type MessageValue = Record<string, unknown>;

function createTranslator(messages: MessageValue) {
  return {
    has: (key: string) => Object.prototype.hasOwnProperty.call(messages, key),
    raw: (key: string) => {
      if (!Object.prototype.hasOwnProperty.call(messages, key)) {
        throw new Error(
          `MISSING_MESSAGE: Could not resolve \`landing.${key}\` in messages for locale \`en\`.`
        );
      }

      return messages[key];
    },
  };
}

function createBaseMessages(): MessageValue {
  return {
    metadata: {
      title: 'mogged',
      description: 'Hosted AI video workflows',
      keywords: 'mogged',
    },
    hero: {
      id: 'hero',
      title: 'mogged',
      description: 'Hero copy',
      tip: 'Hero tip',
    },
    faq: {
      id: 'faq',
      items: [],
    },
    seo_sections: {
      structured_data: {
        feature_list: ['Hosted workflows'],
        alternate_names: ['mogged'],
        about: ['AI video workflow'],
      },
    },
    usage: {
      id: 'usage',
      items: [{ title: 'Write your prompt' }],
    },
    features: {
      id: 'features',
      items: [{ title: 'Motion Quality' }],
    },
    gallery: {
      id: 'gallery',
      title: 'Gallery',
    },
    use_cases: {
      id: 'use-cases',
      title: 'Use cases',
      items: [{ title: 'Product cleanup' }],
    },
    nano_banana_cases: {
      id: 'nano-banana-cases',
      title: 'Typical use cases of Nano Banana',
      items: [
        {
          id: 'ecommerce',
          title: 'E-commerce product promotional image',
        },
      ],
    },
    cta: {
      id: 'cta',
      title: 'Start now',
    },
    testimonials: {
      id: 'testimonials',
      items: [{ name: 'Alex', quote: 'Great' }],
    },
  };
}

describe('buildLandingPageContent', () => {
  it('keeps optional landing sections nullable when messages are missing', () => {
    const messages = createBaseMessages();
    delete messages.introduce;
    delete messages.benefits;
    delete messages.stats;
    delete messages.testimonials;

    const content = buildLandingPageContent({
      locale: 'en',
      t: createTranslator(messages),
    });

    expect(content.page.hero?.title).toBe('mogged');
    expect(content.page.introduce).toBeUndefined();
    expect(content.page.benefits).toBeUndefined();
    expect(content.page.stats).toBeUndefined();
    expect(
      (content.page as Record<string, unknown>).testimonials
    ).toBeUndefined();
    expect(content.page.usage?.id).toBe('usage');
    expect(content.page.nano_banana_cases?.id).toBe('nano-banana-cases');
    expect(content.page.gallery).toBeUndefined();
    expect(content.page.use_cases).toBeUndefined();
  });

  it('can include moved showcase sections for the video generator landing page', () => {
    const content = buildLandingPageContent({
      includeShowcaseSections: true,
      locale: 'en',
      t: createTranslator(createBaseMessages()),
    });

    expect(content.page.gallery?.items).toEqual([]);
    expect(content.page.use_cases?.title).toBe('Use cases');
  });

  it('ignores legacy testimonials content even when it exists in landing messages', () => {
    const content = buildLandingPageContent({
      locale: 'en',
      t: createTranslator(createBaseMessages()),
    });

    expect(
      (content.page as Record<string, unknown>).testimonials
    ).toBeUndefined();
  });

  it('still fails early when a required landing section is missing', () => {
    const messages = createBaseMessages();
    delete messages.hero;

    expect(() =>
      buildLandingPageContent({
        locale: 'en',
        t: createTranslator(messages),
      })
    ).toThrow(/landing\.hero/);
  });
});
