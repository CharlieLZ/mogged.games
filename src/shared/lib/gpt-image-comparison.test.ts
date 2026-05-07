import { describe, expect, it } from 'vitest';

const LOCALIZED_COMPARISON_LOCALES = [
  'zh',
  'de',
  'fr',
  'es',
  'ja',
  'it',
  'ko',
  'ar',
] as const;

import {
  getGptImageComparisonCopy,
  getGptImageComparisonItems,
} from './gpt-image-comparison';

describe('gpt-image-comparison', () => {
  it('keeps three complete GPT Image 2 vs Nano Banana Pro comparison sets', () => {
    const items = getGptImageComparisonItems();

    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item.id).toMatch(/^demo-[123]$/);
      expect(item.prompt.length).toBeGreaterThan(240);
      expect(item.gptImage.src).toMatch(
        /^https:\/\/pub-08cd42c8c170417f9a6b61ed628eed2e\.r2\.dev\/gpt-image-2-demo[123]-1\.webp$/
      );
      expect(item.nanoBanana.src).toMatch(
        /^https:\/\/pub-08cd42c8c170417f9a6b61ed628eed2e\.r2\.dev\/gpt-image-2-demo[123]-2\.webp$/
      );
      expect(item.gptImage.alt).toContain('GPT Image 2');
      expect(item.nanoBanana.alt).toContain('Nano Banana Pro');
    }
  });

  it('keeps comparison prompts in english while localizing supporting UI copy and alt text for every public locale', () => {
    const englishCopy = getGptImageComparisonCopy('en');
    const [englishItem] = getGptImageComparisonItems('en');

    expect(englishCopy).toEqual(
      expect.objectContaining({
        title: 'GPT Image 2 vs Nano Banana Pro',
        promptLabel: 'Prompt',
        copyPrompt: 'Copy prompt',
      })
    );

    for (const locale of LOCALIZED_COMPARISON_LOCALES) {
      const localizedCopy = getGptImageComparisonCopy(locale);
      const [localizedItem] = getGptImageComparisonItems(locale);

      expect(localizedCopy.description, `${locale}:description`).not.toBe(
        englishCopy.description
      );
      expect(localizedCopy.promptLabel, `${locale}:promptLabel`).toBeTruthy();
      expect(localizedCopy.copyPrompt, `${locale}:copyPrompt`).toBeTruthy();
      expect(
        localizedItem?.gptImage.alt,
        `${locale}:gptImage.alt`
      ).not.toBe(englishItem?.gptImage.alt);
      expect(
        localizedItem?.nanoBanana.alt,
        `${locale}:nanoBanana.alt`
      ).not.toBe(englishItem?.nanoBanana.alt);
      expect(localizedItem?.prompt, `${locale}:prompt`).toBe(
        englishItem?.prompt
      );
    }
  });
});
