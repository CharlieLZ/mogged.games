import { describe, expect, it } from 'vitest';

import { assertSeedanceProviderSupportsRequest } from './capability';

const baseRequest = {
  scene: 'reference-to-video' as const,
  fast: true,
  prompt: 'Keep the subject identity and animate the motion smoothly.',
  duration: 4,
  executionExpiresAfter: 172800,
  resolution: '480p' as const,
  aspectRatio: '16:9' as const,
  generateAudio: false,
  webSearch: false,
  watermark: false,
  imageUrls: ['https://cdn.example.com/reference.png'],
  videoUrls: [],
  audioUrls: [],
  returnLastFrame: false,
};

describe('seedance provider capabilities', () => {
  it('rejects unsupported webm reference videos for managed providers', () => {
    for (const provider of ['volcengine', 'apimart', 'apixo'] as const) {
      expect(() =>
        assertSeedanceProviderSupportsRequest(provider, {
          ...baseRequest,
          videoUrls: ['https://cdn.example.com/reference.webm'],
        })
      ).toThrowError(
        `${provider} reference videos must use MP4/MOV/M4V URLs.`
      );
    }
  });

  it('allows mp4 reference videos for the managed providers', () => {
    for (const provider of [
      'volcengine',
      'apimart',
      'apixo',
      'evolink',
    ] as const) {
      expect(() =>
        assertSeedanceProviderSupportsRequest(provider, {
          ...baseRequest,
          videoUrls: ['https://cdn.example.com/reference.mp4'],
        })
      ).not.toThrow();
    }
  });
});
