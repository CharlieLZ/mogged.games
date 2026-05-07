import { describe, expect, it } from 'vitest';

import { SEEDANCE_DEFAULT_DURATION_SECONDS } from '@/extensions/ai/seedance/types';

import {
  buildVideoGenerationOptions,
  DEFAULT_VIDEO_DURATION_SECONDS,
  estimateVideoGenerationSeconds,
  normalizeVideoAspectRatio,
  normalizeVideoDurationSeconds,
  normalizeVideoResolution,
} from './video-generator-config';

describe('video-generator-config', () => {
  it('normalizes invalid video form values to safe defaults', () => {
    expect(normalizeVideoDurationSeconds('12')).toBe('12');
    expect(normalizeVideoDurationSeconds('')).toBe(
      DEFAULT_VIDEO_DURATION_SECONDS
    );
    expect(normalizeVideoDurationSeconds('99')).toBe('15');
    expect(normalizeVideoDurationSeconds('1')).toBe('4');
    expect(normalizeVideoResolution('4k')).toBe('720p');
    expect(normalizeVideoAspectRatio('square')).toBe('16:9');
  });

  it('estimates video generation time from normalized inputs', () => {
    expect(
      estimateVideoGenerationSeconds({
        mode: 'text-to-video',
        durationSeconds: '8',
        resolution: '720p',
        fast: false,
      })
    ).toBe(214);
    expect(
      estimateVideoGenerationSeconds({
        mode: 'reference-to-video',
        durationSeconds: 'bad-input',
        resolution: 'bad-input',
        fast: true,
      })
    ).toBe(270);
  });

  it('builds stable video generation options with bounded values', () => {
    expect(
      buildVideoGenerationOptions({
        mode: 'image-to-video',
        durationSeconds: '8',
        resolution: '720p',
        aspectRatio: '9:16',
        fast: true,
        generateAudio: true,
        webSearch: false,
        returnLastFrame: true,
        numericSeed: 42,
        imageUrls: [' https://example.com/source.png '],
      })
    ).toEqual({
      fast: true,
      duration: 8,
      resolution: '720p',
      aspect_ratio: '9:16',
      generate_audio: true,
      web_search: false,
      return_last_frame: true,
      seed: 42,
      image_urls: [' https://example.com/source.png '],
    });

    expect(
      buildVideoGenerationOptions({
        mode: 'text-to-video',
        durationSeconds: 'bad-input',
        resolution: 'bad-input',
        aspectRatio: 'bad-input',
        fast: false,
        generateAudio: false,
        webSearch: false,
        returnLastFrame: false,
      })
    ).toEqual({
      fast: false,
      duration: SEEDANCE_DEFAULT_DURATION_SECONDS,
      resolution: '720p',
      aspect_ratio: '16:9',
      generate_audio: false,
      web_search: false,
    });
  });
});
