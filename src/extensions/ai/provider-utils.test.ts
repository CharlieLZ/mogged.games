import { describe, expect, it, vi } from 'vitest';

import {
  AIInputValidationError,
  resolveKieMarketAspectRatio,
  resolveKieMarketOutputFormat,
  resolveKieNanoBananaProResolution,
  resolveKieVeoAspectRatio,
  resolveKieVeoGenerationType,
  resolveKieVeoSeed,
  resolveStudioVideoDuration,
  resolveWavespeedVeoAspectRatio,
  resolveWavespeedVeoDuration,
  resolveWavespeedVeoResolution,
  sanitizeStudioGenerateOptions,
} from './provider-utils';

vi.mock('server-only', () => ({}));

describe('sanitizeStudioGenerateOptions', () => {
  it('normalizes image scene options to current studio-safe fields', () => {
    const result = sanitizeStudioGenerateOptions({
      scene: 'text-to-image',
      options: {
        image_size: 'portrait_16_9',
        output_format: 'webp',
        num_images: '30',
        guidance_scale: '50',
        seed: '42',
        ignored_field: 'drop-me',
      },
    });

    expect(result).toEqual({
      aspect_ratio: '9:16',
      output_format: 'png',
      num_images: 15,
      guidance_scale: 20,
      seed: 42,
    });
  });

  it('rejects cloud-drive image urls for image-conditioned scenes', () => {
    expect(() =>
      sanitizeStudioGenerateOptions({
        scene: 'image-to-video',
        options: {
          image_url: 'https://drive.google.com/file/d/123/view',
        },
      })
    ).toThrowError(AIInputValidationError);
  });

  it('normalizes video scene settings and drops legacy fields', () => {
    const result = sanitizeStudioGenerateOptions({
      scene: 'text-to-video',
      options: {
        aspect_ratio: 'landscape',
        resolution: '1080p',
        num_frames: '120',
        fps: '24',
        negative_prompt: 'avoid blur',
        video_output_type: 'GIF',
      },
    });

    expect(result).toEqual({
      aspect_ratio: '16:9',
      resolution: '1080p',
      duration: 5,
      negative_prompt: 'avoid blur',
    });
  });
});

describe('provider-specific normalization helpers', () => {
  it('maps KIE market image settings safely', () => {
    expect(
      resolveKieMarketAspectRatio({
        image_size: 'square_hd',
      })
    ).toBe('1:1');
    expect(
      resolveKieMarketOutputFormat({
        output_format: 'jpeg',
      })
    ).toBe('jpg');
    expect(resolveKieNanoBananaProResolution({ resolution: '2k' })).toBe('2K');
    expect(resolveKieNanoBananaProResolution({ resolution: '4k' })).toBe('4K');
  });

  it('maps KIE veo settings to the documented shape', () => {
    expect(resolveKieVeoAspectRatio({ aspect_ratio: '1:1' })).toBe('16:9');
    expect(
      resolveKieVeoGenerationType({
        image_url: 'https://example.com/frame.png',
      })
    ).toBe('FIRST_AND_LAST_FRAMES_2_VIDEO');
    expect(resolveKieVeoSeed({ seed: 42 })).toBe(10042);
  });

  it('maps WaveSpeed veo settings to legal values', () => {
    expect(resolveWavespeedVeoAspectRatio({ aspect_ratio: 'square' })).toBe(
      '16:9'
    );
    expect(resolveWavespeedVeoResolution({ resolution: '480p' })).toBe('720p');
    expect(resolveStudioVideoDuration({ duration: 2 })).toBe(4);
    expect(resolveWavespeedVeoDuration({ duration: 5 })).toBe(6);
  });
});
