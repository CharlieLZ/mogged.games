import { describe, expect, it } from 'vitest';

import { publicSiteLocales } from '@/config/locale';

import { getImageGeneratorShowcaseCopy } from './ai-image-generator-showcase';

describe('ai image generator showcase copy', () => {
  it('ships four showcase sections and four gallery items for every live public locale', () => {
    for (const locale of publicSiteLocales) {
      const copy = getImageGeneratorShowcaseCopy(locale);

      expect(copy.sections, `${locale} sections`).toHaveLength(4);
      expect(copy.gallery.items, `${locale} gallery items`).toHaveLength(4);
      expect(
        Object.prototype.hasOwnProperty.call(copy, 'applyPromptLabel'),
        `${locale} prompt label removed`
      ).toBe(false);
      expect(
        Object.prototype.hasOwnProperty.call(copy, 'jumpToWorkspaceLabel'),
        `${locale} jump label removed`
      ).toBe(false);
      expect(
        Object.prototype.hasOwnProperty.call(copy.gallery, 'title'),
        `${locale} gallery title removed`
      ).toBe(false);
      expect(
        Object.prototype.hasOwnProperty.call(copy.gallery, 'description'),
        `${locale} gallery description removed`
      ).toBe(false);

      for (const section of copy.sections) {
        expect(section.title, `${locale}:${section.id}:title`).toBeTruthy();
        expect(
          section.description,
          `${locale}:${section.id}:description`
        ).toBeTruthy();
        expect(
          Object.prototype.hasOwnProperty.call(section, 'prompt'),
          `${locale}:${section.id}:prompt removed`
        ).toBe(false);
        expect(section.image.alt, `${locale}:${section.id}:alt`).toBeTruthy();
        expect(section.image.src, `${locale}:${section.id}:image`).toMatch(
          /^https:\/\/pub-08cd42c8c170417f9a6b61ed628eed2e\.r2\.dev\//
        );
      }

      for (const item of copy.gallery.items) {
        expect(item.title, `${locale}:${item.id}:title`).toBeTruthy();
        expect(
          Object.prototype.hasOwnProperty.call(item, 'description'),
          `${locale}:${item.id}:description removed`
        ).toBe(false);
        expect(
          Object.prototype.hasOwnProperty.call(item, 'prompt'),
          `${locale}:${item.id}:prompt removed`
        ).toBe(false);
        expect(item.image.alt, `${locale}:${item.id}:alt`).toBeTruthy();
        expect(item.image.src, `${locale}:${item.id}:image`).toMatch(
          /^https:\/\/pub-08cd42c8c170417f9a6b61ed628eed2e\.r2\.dev\//
        );
      }
    }
  });

  it('keeps the gallery item titles in the requested order', () => {
    const copy = getImageGeneratorShowcaseCopy('en');

    expect(copy.gallery.items.map((item) => item.title)).toEqual([
      'Revolutionize e-commerce listings',
      'Craft professional marketing banners',
      'Bring creative visions to life',
      'Boost social media engagement',
    ]);
  });

  it('keeps the requested five showcase components in the right order', () => {
    const copy = getImageGeneratorShowcaseCopy('en');

    expect(copy.sections.map((section) => section.id)).toEqual([
      'overview-collage',
      'illustration-scene',
      'story-frame',
      'retail-concept',
    ]);
    expect(copy.sections.map((section) => section.image.src)).toEqual([
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/main.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/features1.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/features2.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/features3.webp',
    ]);
    expect(copy.gallery.items.map((item) => item.image.src)).toEqual([
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects1.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects3.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects4.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects2.webp',
    ]);
  });

  it('keeps the story frame shell aligned with the retail concept shell tone', () => {
    const copy = getImageGeneratorShowcaseCopy('en');
    const storyFrame = copy.sections.find(
      (section) => section.id === 'story-frame'
    );
    const retailConcept = copy.sections.find(
      (section) => section.id === 'retail-concept'
    );

    expect(storyFrame?.tone).toBe('meadow');
    expect(retailConcept?.tone).toBe('meadow');
  });

  it('uses refreshed English and Chinese positioning copy', () => {
    expect(getImageGeneratorShowcaseCopy('en').sections[0]?.title).toBe(
      'Plan every AI image direction in one workspace'
    );
    expect(getImageGeneratorShowcaseCopy('zh').sections[0]?.title).toBe(
      '在一个工作台里先定好所有生图方向'
    );
  });

  it('only flips the requested illustration and retail showcase splits', () => {
    const copy = getImageGeneratorShowcaseCopy('en');

    expect(copy.sections.map((section) => section.imagePosition)).toEqual([
      'right',
      'left',
      'right',
      'left',
    ]);
  });
});
