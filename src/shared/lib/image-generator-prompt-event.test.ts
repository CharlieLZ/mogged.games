import { describe, expect, it } from 'vitest';

import { normalizeImageGeneratorApplyPromptDetail } from './image-generator-prompt-event';

describe('normalizeImageGeneratorApplyPromptDetail', () => {
  it('rejects empty prompt event payloads', () => {
    expect(normalizeImageGeneratorApplyPromptDetail(null)).toBeNull();
    expect(normalizeImageGeneratorApplyPromptDetail({})).toBeNull();
    expect(
      normalizeImageGeneratorApplyPromptDetail({
        prompt: '   ',
        mode: 'image-to-image',
      })
    ).toBeNull();
  });

  it('trims valid prompt payloads and drops unsupported modes', () => {
    expect(
      normalizeImageGeneratorApplyPromptDetail({
        prompt: '  Product photo prompt  ',
        mode: 'unsupported',
        sourceImageUrl: '  https://cdn.example.com/reference.webp  ',
      })
    ).toEqual({
      prompt: 'Product photo prompt',
      sourceImageUrl: 'https://cdn.example.com/reference.webp',
    });
  });
});
