import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';

import { APIMartSeedanceAdapter } from './apimart';

vi.mock('server-only', () => ({}));

describe('APIMartSeedanceAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('includes callback_url when APIMart generate runs asynchronously', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 200,
          data: [{ status: 'submitted', task_id: 'apimart-task-1' }],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new APIMartSeedanceAdapter();
    const result = await adapter.generate({
      apiKey: 'apimart-secret',
      request: {
        scene: 'text-to-video',
        fast: true,
        prompt: 'golden horse running through fog',
        duration: 8,
        executionExpiresAfter: 172800,
        resolution: '720p',
        aspectRatio: '16:9',
        generateAudio: true,
        webSearch: false,
        seed: 7,
        watermark: false,
        imageUrls: [],
        videoUrls: [],
        audioUrls: [],
        returnLastFrame: false,
      },
      callbackUrl: 'https://mogged.games/api/ai/notify/apimart',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.apimart.ai/v1/videos/generations');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer apimart-secret',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      model: 'doubao-seedance-2.0-fast',
      prompt: 'golden horse running through fog',
      resolution: '720p',
      size: '16:9',
      duration: 8,
      generate_audio: true,
      seed: 7,
      callback_url: 'https://mogged.games/api/ai/notify/apimart',
    });
    expect(result).toMatchObject({
      provider: 'apimart',
      model: 'doubao-seedance-2.0-fast',
      result: {
        taskId: 'apimart-task-1',
        taskStatus: AITaskStatus.PENDING,
      },
    });
  });
});
