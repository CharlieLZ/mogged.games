import { describe, expect, it } from 'vitest';

import {
  getReplacePsShowcaseCategories,
  getReplacePsShowcaseCopy,
} from './replace-ps-showcase';

const LOCALIZED_SHOWCASE_LOCALES = [
  'zh',
  'de',
  'fr',
  'es',
  'ja',
  'it',
  'ko',
  'ar',
] as const;

const R2_IMAGE_URL_PATTERN =
  /^https:\/\/pub-08cd42c8c170417f9a6b61ed628eed2e\.r2\.dev\/(?:background|lighting|color|item)-(?:before|after)-[a-z0-9-]+\.webp$/;

const EXPECTED_R2_FILES = [
  'background-after-green-field-jeep.webp',
  'background-after-snowy-winter-jeep.webp',
  'background-after-urban-street-jeep.webp',
  'background-before-desert-jeep.webp',
  'color-after-blue-rose.webp',
  'color-after-green-rose.webp',
  'color-after-yellow-rose.webp',
  'color-before-red-rose.webp',
  'item-after-banana-on-plate.webp',
  'item-after-cola-bottle.webp',
  'item-after-white-cup-on-table.webp',
  'item-before-latte-on-table.webp',
  'lighting-after-blue-hour-coast.webp',
  'lighting-after-golden-hour-coast.webp',
  'lighting-after-night-city-lights.webp',
  'lighting-before-coastal-day.webp',
] as const;

function getImageFileName(src: string) {
  return src.split('/').pop();
}

describe('replace-ps-showcase', () => {
  it('keeps four complete image editing categories from the R2 upload table', () => {
    const categories = getReplacePsShowcaseCategories('en');

    expect(categories.map((category) => category.id)).toEqual([
      'background-replacement',
      'lighting-adjustment',
      'color-change',
      'item-replacement',
    ]);
    expect(categories.flatMap((category) => category.slides)).toHaveLength(12);

    for (const category of categories) {
      expect(category.tabLabel.length).toBeGreaterThan(4);
      expect(category.beforeImage.src).toMatch(R2_IMAGE_URL_PATTERN);
      expect(category.beforeImage.alt).toContain(category.tabLabel);
      expect(category.slides).toHaveLength(3);

      for (const slide of category.slides) {
        expect(slide.id).toMatch(
          /^(background|lighting|color|item)-[a-z0-9-]+$/
        );
        expect(slide.prompt.length).toBeGreaterThan(18);
        expect(slide.afterImage.src).toMatch(R2_IMAGE_URL_PATTERN);
        expect(slide.afterImage.alt).toContain(category.tabLabel);
      }
    }
  });

  it('matches the uploaded R2 replace-ps file set without duplicates', () => {
    const categories = getReplacePsShowcaseCategories('en');
    const imageFileNames = categories
      .flatMap((category) => [
        category.beforeImage.src,
        ...category.slides.map((slide) => slide.afterImage.src),
      ])
      .map(getImageFileName)
      .sort();

    expect(imageFileNames).toEqual([...EXPECTED_R2_FILES].sort());
    expect(new Set(imageFileNames).size).toBe(EXPECTED_R2_FILES.length);
  });

  it('keeps showcase chrome and category content localized for every public locale', () => {
    const englishCopy = getReplacePsShowcaseCopy('en');
    const [englishCategory] = getReplacePsShowcaseCategories('en');

    expect(englishCopy).toEqual(
      expect.objectContaining({
        title: 'Skip the traditional Photoshop workflow',
        copyPrompt: 'Copy prompt',
        pauseAutoRotate: 'Pause automatic showcase',
        playAutoRotate: 'Play automatic showcase',
      })
    );

    expect(englishCategory?.tabLabel).toBe('Background Replacement');

    for (const locale of LOCALIZED_SHOWCASE_LOCALES) {
      const localizedCopy = getReplacePsShowcaseCopy(locale);
      const [localizedCategory] = getReplacePsShowcaseCategories(locale);

      expect(localizedCopy.description, `${locale}:description`).not.toBe(
        englishCopy.description
      );
      expect(localizedCategory?.tabLabel, `${locale}:tabLabel`).not.toBe(
        englishCategory?.tabLabel
      );
      expect(
        localizedCategory?.slides[0]?.prompt,
        `${locale}:first-slide-prompt`
      ).not.toBe(englishCategory?.slides[0]?.prompt);
    }
  });
});
