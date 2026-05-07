import { describe, expect, it } from 'vitest';

import { getImageGeneratorErrorDescriptor } from './image-generator-error';

describe('image-generator-error', () => {
  it('maps API provider-unavailable codes to translated keys', () => {
    expect(
      getImageGeneratorErrorDescriptor({
        raw: 'This AI route is temporarily unavailable because an upstream provider is not configured.',
        errorCode: 'ai_generate_provider_unavailable',
        mode: 'text-to-image',
        imageUrl: '',
      })
    ).toEqual({
      kind: 'translation',
      key: 'error_provider_unavailable',
    });
  });

  it('maps API prompt-required codes to translated keys', () => {
    expect(
      getImageGeneratorErrorDescriptor({
        raw: 'prompt is required',
        errorCode: 'ai_generate_prompt_required',
        mode: 'text-to-image',
        imageUrl: '',
      })
    ).toEqual({
      kind: 'translation',
      key: 'prompt_required',
    });
  });

  it('maps raw invalid-payload messages to translated keys', () => {
    expect(
      getImageGeneratorErrorDescriptor({
        raw: 'invalid generate payload',
        errorCode: null,
        mode: 'text-to-image',
        imageUrl: '',
      })
    ).toEqual({
      kind: 'translation',
      key: 'error_invalid_request',
    });
  });
});
