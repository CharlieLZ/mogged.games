import { describe, expect, it } from 'vitest';

import { getPromptExamples } from '@/shared/blocks/generator/prompt-examples';
import { getGeneratorSampleMedia } from '@/shared/blocks/generator/sample-media';

import { getImageGeneratorModeFaqCopy } from './ai-image-generator-seo';
import {
  getGeneratorModeFaqCopy,
  getGeneratorModeSeoCopy,
} from './ai-video-generator-seo';
import { getLandingPreviewSampleVideos } from './landing-showcase-videos';

describe('public copy localization regressions', () => {
  it('localizes generator sample preview titles and alts outside english', () => {
    expect(
      getLandingPreviewSampleVideos('ja').map((item) => item.title)
    ).toEqual([
      'mogged 縦長サンプルプレビュー',
      'mogged 別パターン縦長サンプルプレビュー',
    ]);
    expect(
      getLandingPreviewSampleVideos('ar').map((item) => item.title)
    ).toEqual([
      'معاينة عمودية تجريبية من mogged',
      'معاينة عمودية تجريبية بديلة من mogged',
    ]);

    expect(getGeneratorSampleMedia('image-to-video', 'ja')[0]?.alt).toBe(
      'mogged の開始フレームと終了フレームのサンプルプレビュー'
    );
    expect(getGeneratorSampleMedia('reference-to-video', 'ar')[0]?.alt).toBe(
      'معاينة تجريبية متعددة المراجع من mogged'
    );
  });

  it('localizes generator prompt examples outside english', () => {
    expect(getPromptExamples('text-to-video', 'ja')[0]).toMatch(
      /[ぁ-んァ-ヶ一-龯]/
    );
    expect(getPromptExamples('reference-to-video', 'ar')[0]).toMatch(
      /[\u0600-\u06FF]/
    );
  });

  it('keeps non-english generator faq labels and seo titles free from english workflow slugs', () => {
    for (const locale of ['de', 'fr', 'es', 'ja', 'it', 'ko', 'ar'] as const) {
      for (const mode of [
        'text-to-video',
        'image-to-video',
        'reference-to-video',
      ] as const) {
        const faqCopy = getGeneratorModeFaqCopy(locale, mode);
        const seoCopy = getGeneratorModeSeoCopy(locale, mode);

        expect(faqCopy.label).toBeTruthy();
        expect(faqCopy.title).toBeTruthy();
        expect(faqCopy.label?.toLowerCase()).not.toContain(mode);
        expect(faqCopy.title?.toLowerCase()).not.toContain(mode);
        expect(seoCopy.metadataTitle.toLowerCase()).not.toContain(mode);
      }
    }
  });

  it('keeps non-english image generator mode faq labels and titles free from english workflow slugs', () => {
    for (const locale of ['de', 'fr', 'es', 'ja', 'it', 'ko', 'ar'] as const) {
      for (const mode of ['text-to-image', 'image-to-image'] as const) {
        const faqCopy = getImageGeneratorModeFaqCopy(locale, mode);

        expect(faqCopy.title).toBeTruthy();
        expect(faqCopy.title?.toLowerCase()).not.toContain(mode);
        expect(faqCopy.description).toBeTruthy();
      }
    }
  });
});
