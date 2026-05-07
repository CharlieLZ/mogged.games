import { describe, expect, it } from 'vitest';

import {
  createShowcaseImage,
  SHOWCASE_ASSET_MANIFEST,
} from './ai-image-generator-showcase-assets';

describe('ai image generator showcase assets', () => {
  it('uses the uploaded R2 image manifest without changing filenames or URLs', () => {
    expect(SHOWCASE_ASSET_MANIFEST).toEqual({
      coffee: {
        filename: 'effects1.webp',
        src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects1.webp',
      },
      journal: {
        filename: 'effects2.webp',
        src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects2.webp',
      },
      perfume: {
        filename: 'effects3.webp',
        src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects3.webp',
      },
      poster: {
        filename: 'effects4.webp',
        src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/effects4.webp',
      },
      santorini: {
        filename: 'features1.webp',
        src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/features1.webp',
      },
      story: {
        filename: 'features2.webp',
        src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/features2.webp',
      },
      basket: {
        filename: 'features3.webp',
        src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/features3.webp',
      },
      collage: {
        filename: 'main.webp',
        src: 'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/main.webp',
      },
    });
  });

  it('fails early when an image alt is blank', () => {
    expect(() => createShowcaseImage('basket', '   ')).toThrow(
      '[ai-image-generator-showcase] missing alt text for basket'
    );
  });
});
