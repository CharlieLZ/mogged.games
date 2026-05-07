import { describe, expect, it } from 'vitest';

import { assertSeedanceProviderSupportsRequest } from './capability';
import { SeedanceValidationError } from './errors';
import { SEEDANCE_DEFAULT_DURATION_SECONDS } from './types';
import { normalizeSeedanceRequest } from './validation';

describe('seedance validation', () => {
  it('normalizes safe defaults for text mode', () => {
    expect(
      normalizeSeedanceRequest({
        scene: 'text-to-video',
        prompt: '  test  ',
        options: {},
      })
    ).toEqual({
      scene: 'text-to-video',
      fast: true,
      prompt: 'test',
      duration: SEEDANCE_DEFAULT_DURATION_SECONDS,
      executionExpiresAfter: 172800,
      resolution: '720p',
      aspectRatio: '16:9',
      generateAudio: true,
      webSearch: false,
      seed: undefined,
      safetyIdentifier: undefined,
      watermark: false,
      imageUrls: [],
      videoUrls: [],
      audioUrls: [],
      returnLastFrame: false,
    });
  });

  it('rejects references in text mode', () => {
    expect(() =>
      normalizeSeedanceRequest({
        scene: 'text-to-video',
        prompt: 'test',
        options: {
          image_urls: ['https://example.com/a.png'],
        },
      })
    ).toThrowError(SeedanceValidationError);
  });

  it('builds image mode from first and last frame urls', () => {
    expect(
      normalizeSeedanceRequest({
        scene: 'image-to-video',
        prompt: 'test',
        options: {
          first_frame_url: 'https://example.com/start.png',
          last_frame_url: 'https://example.com/end.png',
          duration: 15,
          resolution: '480p',
          fast: false,
        },
      })
    ).toMatchObject({
      scene: 'image-to-video',
      fast: false,
      duration: 15,
      resolution: '480p',
      imageUrls: [
        'https://example.com/start.png',
        'https://example.com/end.png',
      ],
    });
  });

  it('allows promptless image-to-video requests and normalizes official controls', () => {
    expect(
      normalizeSeedanceRequest({
        scene: 'image-to-video',
        prompt: '   ',
        options: {
          image_url: 'https://example.com/start.png',
          execution_expires_after: 7200,
          watermark: true,
          safety_identifier: 'seedance-cli-smoke-user',
        },
      })
    ).toMatchObject({
      scene: 'image-to-video',
      prompt: '',
      executionExpiresAfter: 7200,
      watermark: true,
      safetyIdentifier: 'seedance-cli-smoke-user',
      imageUrls: ['https://example.com/start.png'],
    });
  });

  it('allows promptless reference-to-video requests', () => {
    expect(
      normalizeSeedanceRequest({
        scene: 'reference-to-video',
        prompt: '   ',
        options: {
          image_urls: ['https://example.com/reference.png'],
        },
      })
    ).toMatchObject({
      scene: 'reference-to-video',
      prompt: '',
      imageUrls: ['https://example.com/reference.png'],
    });
  });

  it('accepts official asset:// references without blocking the KIE path', () => {
    const request = normalizeSeedanceRequest({
      scene: 'reference-to-video',
      prompt: '',
      options: {
        image_urls: ['asset://persona/virtual-human-123'],
      },
    });

    expect(request.imageUrls).toEqual(['asset://persona/virtual-human-123']);
    expect(() =>
      assertSeedanceProviderSupportsRequest('volcengine', request)
    ).not.toThrow();
    expect(() =>
      assertSeedanceProviderSupportsRequest('kie', request)
    ).not.toThrow();
  });

  it('rejects obvious media type mismatches in reference urls', () => {
    expect(() =>
      normalizeSeedanceRequest({
        scene: 'image-to-video',
        prompt: 'test',
        options: {
          image_url: 'https://example.com/reference.mp4',
        },
      })
    ).toThrowError(
      new SeedanceValidationError('image_url must point to an image file.')
    );

    expect(() =>
      normalizeSeedanceRequest({
        scene: 'reference-to-video',
        prompt: 'test',
        options: {
          image_urls: ['https://example.com/reference.png'],
          audio_urls: ['https://example.com/reference.mov'],
        },
      })
    ).toThrowError(
      new SeedanceValidationError('audio_url must point to an audio file.')
    );
  });

  it('rejects private or share-page reference urls', () => {
    expect(() =>
      normalizeSeedanceRequest({
        scene: 'reference-to-video',
        prompt: 'test',
        options: {
          image_urls: ['https://drive.google.com/file/d/abc/view'],
        },
      })
    ).toThrowError(/cloud-drive or social share link/);

    expect(() =>
      normalizeSeedanceRequest({
        scene: 'reference-to-video',
        prompt: 'test',
        options: {
          video_urls: ['http://192.168.1.10/clip.mp4'],
          image_urls: ['https://example.com/reference.png'],
        },
      })
    ).toThrowError(/publicly reachable/);
  });

  it('rejects audio-only reference requests', () => {
    expect(() =>
      normalizeSeedanceRequest({
        scene: 'reference-to-video',
        prompt: 'test',
        options: {
          audio_urls: ['https://example.com/voice.mp3'],
        },
      })
    ).toThrowError(SeedanceValidationError);
  });

  it('rejects first or last frame inputs in reference mode', () => {
    expect(() =>
      normalizeSeedanceRequest({
        scene: 'reference-to-video',
        prompt: 'test',
        options: {
          first_frame_url: 'https://example.com/start.png',
          image_urls: ['https://example.com/reference.png'],
        },
      })
    ).toThrowError(
      new SeedanceValidationError(
        'reference mode does not accept first_frame_url/start_image_url/last_frame_url inputs. Use image_urls, video_urls, and audio_urls instead.'
      )
    );

    expect(() =>
      normalizeSeedanceRequest({
        scene: 'reference-to-video',
        prompt: 'test',
        options: {
          last_frame_url: 'https://example.com/end.png',
          video_urls: ['https://example.com/reference.mp4'],
        },
      })
    ).toThrowError(
      new SeedanceValidationError(
        'reference mode does not accept first_frame_url/start_image_url/last_frame_url inputs. Use image_urls, video_urls, and audio_urls instead.'
      )
    );
  });

  it('enforces reference count limits', () => {
    expect(() =>
      normalizeSeedanceRequest({
        scene: 'reference-to-video',
        prompt: 'test',
        options: {
          image_urls: Array.from(
            { length: 10 },
            (_, index) => `https://example.com/${index}.png`
          ),
        },
      })
    ).toThrowError('at most 9 reference images are allowed.');

    expect(() =>
      normalizeSeedanceRequest({
        scene: 'reference-to-video',
        prompt: 'test',
        options: {
          image_urls: ['https://example.com/0.png'],
          video_urls: Array.from(
            { length: 4 },
            (_, index) => `https://example.com/${index}.mp4`
          ),
        },
      })
    ).toThrowError('at most 3 reference videos are allowed.');
  });

  it('fails fast when provider lacks web search support', () => {
    const request = normalizeSeedanceRequest({
      scene: 'reference-to-video',
      prompt: 'test',
      options: {
        image_urls: ['https://example.com/a.png'],
        web_search: true,
      },
    });

    expect(() =>
      assertSeedanceProviderSupportsRequest('fal', request)
    ).toThrowError(SeedanceValidationError);
  });

  it('treats negative seeds as provider-managed randomness', () => {
    expect(
      normalizeSeedanceRequest({
        scene: 'text-to-video',
        prompt: 'test',
        options: {
          seed: -1,
        },
      }).seed
    ).toBeUndefined();
  });

  it('rejects execution_expires_after values outside the official range', () => {
    expect(() =>
      normalizeSeedanceRequest({
        scene: 'reference-to-video',
        prompt: '',
        options: {
          image_urls: ['https://example.com/reference.png'],
          execution_expires_after: 3599,
        },
      })
    ).toThrowError(
      new SeedanceValidationError(
        'execution_expires_after must be between 3600 and 259200 seconds.'
      )
    );
  });

  it('rejects evolink web search outside text-to-video', () => {
    const request = normalizeSeedanceRequest({
      scene: 'reference-to-video',
      prompt: 'test',
      options: {
        image_urls: ['https://example.com/a.png'],
        web_search: true,
      },
    });

    expect(() =>
      assertSeedanceProviderSupportsRequest('evolink', request)
    ).toThrowError(
      new SeedanceValidationError(
        'evolink supports web search only for text-to-video requests.'
      )
    );
  });
});
