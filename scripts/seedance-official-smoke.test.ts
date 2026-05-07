import { describe, expect, it, vi } from 'vitest';

import {
  OFFICIAL_VOLCENGINE_SEEDANCE_CREATE_URL,
  parseSeedanceOfficialSmokeArgs,
} from './seedance-official-smoke';

vi.mock('server-only', () => ({}));

describe('seedance official smoke script', () => {
  it('defaults to a dry run against the official Volcengine endpoint', () => {
    const options = parseSeedanceOfficialSmokeArgs([
      '--scene=text-to-video',
      '--prompt=golden horse at sunset',
    ]);

    expect(OFFICIAL_VOLCENGINE_SEEDANCE_CREATE_URL).toBe(
      'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks'
    );
    expect(options).toMatchObject({
      scene: 'text-to-video',
      prompt: 'golden horse at sunset',
      duration: 4,
      executionExpiresAfter: 3600,
      resolution: '480p',
      fast: true,
      generateAudio: false,
      watermark: false,
      dryRun: true,
      wait: false,
    });
  });

  it('parses reference smoke requests with optional prompt and official controls', () => {
    const options = parseSeedanceOfficialSmokeArgs([
      '--scene=reference-to-video',
      '--image-url=https://cdn.example.com/reference.png',
      '--video-url=https://cdn.example.com/reference.mp4',
      '--execution-expires-after=7200',
      '--watermark',
      '--safety-identifier=seedance-cli-smoke-user',
      '--execute',
      '--wait',
    ]);

    expect(options).toMatchObject({
      scene: 'reference-to-video',
      prompt: '',
      imageUrls: ['https://cdn.example.com/reference.png'],
      videoUrls: ['https://cdn.example.com/reference.mp4'],
      executionExpiresAfter: 7200,
      safetyIdentifier: 'seedance-cli-smoke-user',
      watermark: true,
      dryRun: false,
      wait: true,
    });
  });
});
