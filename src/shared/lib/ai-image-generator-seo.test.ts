import { describe, expect, it } from 'vitest';

import {
  getImageGeneratorModeFaqCopy,
  getImageGeneratorRootFaqCopy,
  getImageGeneratorRootSeoCopy,
} from './ai-image-generator-seo';
import { getFaqItems } from './faq';

const publicLocales = [
  'en',
  'zh',
  'de',
  'fr',
  'es',
  'ja',
  'it',
  'ko',
  'ar',
] as const;

describe('ai image generator seo copy', () => {
  const countFaqItems = (
    faq: NonNullable<Parameters<typeof getFaqItems>[0]>
  ): number => getFaqItems(faq).length;

  it('keeps the root page owning AI image generator intent while supporting editing workflows', () => {
    const copy = getImageGeneratorRootSeoCopy('en');

    expect(copy.metadataTitle).toBe(
      'AI Image Generator | mogged Online Workspace'
    );
    expect(copy.heading).toBe('AI Image Generator Free Online');
    expect(copy.description).toContain('mogged');
    expect(copy.description).toContain('AI image generator');
    expect(copy.description).toContain('text-to-image');
    expect(copy.description).toContain('image-to-image');
    expect(copy.keywords).toContain('image editor ai');
    expect(copy.keywords).toContain('ai image generator');
    expect(copy.keywords).toContain('ai image editor');
    expect(copy.keywords).toContain('ai photo editor');
    expect(copy.keywords).toContain('online image editor');
  });

  it('keeps the expanded root FAQ localized across every public locale', () => {
    for (const locale of publicLocales) {
      const faq = getImageGeneratorRootFaqCopy(locale);
      const flattenedText = [
        faq.title,
        faq.description,
        ...getFaqItems(faq).flatMap((item) => [item.question, item.answer]),
      ]
        .filter(Boolean)
        .join(' ');

      expect(flattenedText).toContain('mogged');
      expect(flattenedText).not.toContain('PhotoEditorAI');
      expect(flattenedText).not.toContain('eight-model');
      const itemCount = getFaqItems(faq).length;

      expect(itemCount).toBeGreaterThanOrEqual(10);
      expect(itemCount).toBeLessThanOrEqual(12);
    }
  });

  it('answers the root English AI image generator questions with current product facts', () => {
    const faq = getImageGeneratorRootFaqCopy('en');
    const questions = getFaqItems(faq).map((item) => item.question);
    const answers = getFaqItems(faq)
      .map((item) => item.answer)
      .join(' ');

    expect(faq.title).toContain('AI Image Generator');
    expect(questions).toEqual(
      expect.arrayContaining([
        'What is an AI image generator?',
        'Is this AI image generator really free, with no sign up?',
        'Do I need design skills to use the AI image generator?',
        'Which image workflows are public right now?',
        'How can I generate AI images from text prompts?',
        'Can I use image-to-image with a reference?',
        'Which AI image generator models are available?',
        'How long does the AI image generator take?',
        'What image styles can I create with the AI image generator?',
        'What resolution does the AI image generator output?',
        'Can I use AI generated images for commercial purposes?',
        'Is my data safe when using the AI image generator?',
      ])
    );
    expect(answers).toContain('KIE model routing');
    expect(answers).toContain('text-to-image');
    expect(answers).toContain('image-to-image');
    expect(answers).toContain('GPT Image 2');
    expect(answers).toContain('Nano Banana Pro');
    expect(answers).not.toContain('PhotoEditorAI');
    expect(answers).not.toContain('eight-model');
  });

  it('keeps image mode FAQ pages substantial enough for the two-column layout across every public locale', () => {
    for (const locale of publicLocales) {
      for (const mode of ['text-to-image', 'image-to-image'] as const) {
        expect(
          countFaqItems(getImageGeneratorModeFaqCopy(locale, mode))
        ).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
