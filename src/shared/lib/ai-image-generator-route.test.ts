import { describe, expect, it } from 'vitest';

import {
  getDefaultImageGeneratorMode,
  getExplicitImageGeneratorMode,
  getRawImageGeneratorModeParam,
} from './ai-image-generator-route';

describe('ai image generator route helpers', () => {
  it('reads raw mode values from string and array search params', () => {
    expect(getRawImageGeneratorModeParam({ mode: 'text-to-image' })).toBe(
      'text-to-image'
    );
    expect(
      getRawImageGeneratorModeParam({
        mode: ['image-to-image', 'text-to-image'],
      })
    ).toBe('image-to-image');
    expect(getRawImageGeneratorModeParam({})).toBeNull();
  });

  it('keeps only explicit public image modes', () => {
    expect(getExplicitImageGeneratorMode({ mode: 'image-to-image' })).toBe(
      'image-to-image'
    );
    expect(getExplicitImageGeneratorMode({ mode: 'text-to-video' })).toBeNull();
    expect(getExplicitImageGeneratorMode({ mode: 'unexpected' })).toBeNull();
  });

  it('uses the mode query param to choose the default tab without redirecting', () => {
    expect(
      getDefaultImageGeneratorMode({ mode: 'image-to-image' })
    ).toBe('image-to-image');
    expect(
      getDefaultImageGeneratorMode({ mode: 'unexpected' })
    ).toBe('text-to-image');
  });
});
