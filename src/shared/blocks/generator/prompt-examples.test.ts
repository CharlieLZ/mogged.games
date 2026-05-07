import { describe, expect, it } from 'vitest';

import { locales } from '@/config/locale';

import {
  type GeneratorPromptMode,
  getPromptExamples,
} from './prompt-examples';

const GENERATOR_PROMPT_MODES: readonly GeneratorPromptMode[] = [
  'text-to-video',
  'image-to-video',
  'reference-to-video',
  'text-to-image',
  'image-to-image',
] as const;

describe('prompt-examples', () => {
  it('ships three prompt examples for every supported locale and workflow', () => {
    for (const locale of locales) {
      for (const mode of GENERATOR_PROMPT_MODES) {
        const examples = getPromptExamples(mode, locale);

        expect(examples, `${locale}:${mode}`).toHaveLength(3);

        for (const example of examples) {
          expect(example.trim().length, `${locale}:${mode}`).toBeGreaterThan(40);
        }
      }
    }
  });

  it('keeps non-english prompt examples distinct from english copy for every workflow', () => {
    for (const locale of locales.filter((value) => value !== 'en')) {
      for (const mode of GENERATOR_PROMPT_MODES) {
        expect(getPromptExamples(mode, locale)[0], `${locale}:${mode}`).not.toBe(
          getPromptExamples(mode, 'en')[0]
        );
      }
    }
  });
});
