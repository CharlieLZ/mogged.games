import { describe, expect, it } from 'vitest';

import {
  DEFAULT_VIDEO_GENERATOR_MODE,
  VIDEO_GENERATOR_MODES,
} from '@/shared/blocks/generator/video-generator-mode';
import {
  IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL,
  IMAGEEDITORAI_REMOTE_ASSET_ORIGIN,
} from '@/shared/lib/imageeditorai-media';

import { getGeneratorSampleMedia } from './sample-media';

describe('generator sample media', () => {
  it('keeps all generator sample media on verified homepage video and poster urls', () => {
    expect(DEFAULT_VIDEO_GENERATOR_MODE).toBe('text-to-video');

    for (const mode of VIDEO_GENERATOR_MODES) {
      const media = getGeneratorSampleMedia(mode);
      expect(media.length).toBeGreaterThan(0);

      for (const item of media) {
        expect(item.url.startsWith(`${IMAGEEDITORAI_HOME_VIDEO_SAMPLE_BASE_URL}/`))
          .toBe(true);
        expect(item.url).not.toContain('/imgs/');

        if (item.posterUrl) {
          expect(
            item.posterUrl.startsWith(`${IMAGEEDITORAI_REMOTE_ASSET_ORIGIN}/`)
          ).toBe(true);
          expect(item.posterUrl).not.toContain('/imgs/');
        }
      }
    }
  });
});
