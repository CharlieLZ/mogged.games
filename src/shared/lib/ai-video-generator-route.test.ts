import { describe, expect, it } from 'vitest';

import {
  buildImageToVideoGeneratorHref,
  getAiGeneratorModeRedirectHref,
  getAiVideoGeneratorModeStateHref,
  getExplicitGeneratorMode,
  getRawGeneratorModeParam,
} from './ai-video-generator-route';

describe('ai generator route helpers', () => {
  it('reads raw mode values from string and array search params', () => {
    expect(getRawGeneratorModeParam({ mode: 'text-to-video' })).toBe(
      'text-to-video'
    );
    expect(
      getRawGeneratorModeParam({ mode: ['image-to-video', 'text-to-video'] })
    ).toBe('image-to-video');
    expect(getRawGeneratorModeParam({})).toBeNull();
  });

  it('keeps only explicit public video modes', () => {
    expect(getExplicitGeneratorMode({ mode: 'reference-to-video' })).toBe(
      'reference-to-video'
    );
    expect(getExplicitGeneratorMode({ mode: 'text-to-image' })).toBeNull();
    expect(getExplicitGeneratorMode({ mode: 'unexpected' })).toBeNull();
  });

  it('keeps explicit public video mode query params on the root video workspace state url', () => {
    expect(
      getAiGeneratorModeRedirectHref({
        locale: 'en',
        searchParams: { mode: 'text-to-video' },
      })
    ).toBeNull();
    expect(
      getAiGeneratorModeRedirectHref({
        locale: 'zh',
        searchParams: { mode: 'image-to-image' },
      })
    ).toBe('/zh/ai-video-generator');
  });

  it('drops invalid mode params while preserving unrelated query params', () => {
    expect(
      getAiGeneratorModeRedirectHref({
        locale: 'en',
        searchParams: {
          mode: 'unexpected',
          ref: 'ad',
        },
      })
    ).toBe('/ai-video-generator?ref=ad');
  });

  it('builds localized root video workspace state urls from clean workflow paths', () => {
    expect(
      getAiVideoGeneratorModeStateHref({
        locale: 'en',
        mode: 'reference-to-video',
        searchParams: { ref: 'seo' },
      })
    ).toBe('/ai-video-generator?ref=seo&mode=reference-to-video');
    expect(
      getAiVideoGeneratorModeStateHref({
        locale: 'zh',
        mode: 'image-to-video',
        searchParams: { imageUrl: 'https://cdn.example.com/shot.webp' },
      })
    ).toBe(
      '/zh/ai-video-generator?imageUrl=https%3A%2F%2Fcdn.example.com%2Fshot.webp&mode=image-to-video'
    );
  });

  it('builds localized image-to-video links with a direct image url query param', () => {
    expect(
      buildImageToVideoGeneratorHref({
        imageUrl: 'https://cdn.example.com/reference image.webp',
        locale: 'zh',
      })
    ).toBe(
      '/zh/ai-video-generator?imageUrl=https%3A%2F%2Fcdn.example.com%2Freference+image.webp&mode=image-to-video'
    );
  });
});
