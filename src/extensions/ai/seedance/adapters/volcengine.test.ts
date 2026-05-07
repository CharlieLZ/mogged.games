import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';

import { VolcengineSeedanceAdapter } from './volcengine';

vi.mock('server-only', () => ({}));

describe('VolcengineSeedanceAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the official create payload for reference-to-video tasks', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'cgt-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new VolcengineSeedanceAdapter();
    const result = await adapter.generate({
      apiKey: 've-secret',
      request: {
        scene: 'reference-to-video',
        fast: true,
        prompt: 'Use the reference video motion and image style.',
        duration: 11,
        executionExpiresAfter: 172800,
        resolution: '720p',
        aspectRatio: 'auto',
        generateAudio: true,
        webSearch: true,
        seed: 42,
        safetyIdentifier:
          '5e5c9f2c6e6f0c4b3e1b3c4f5d3d2f8a5a4a0e0f4e7d6c5b4a39281716151413',
        watermark: false,
        imageUrls: ['https://cdn.example.com/reference-image.png'],
        videoUrls: ['https://cdn.example.com/reference-video.mp4'],
        audioUrls: ['https://cdn.example.com/reference-audio.mp3'],
        returnLastFrame: true,
      },
      callbackUrl: 'https://mogged.games/api/ai/notify/volcengine',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks'
    );
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer ve-secret',
      'Content-Type': 'application/json',
    });

    expect(JSON.parse(String(init?.body))).toEqual({
      model: 'doubao-seedance-2-0-fast-260128',
      content: [
        {
          type: 'text',
          text: 'Use the reference video motion and image style.',
        },
        {
          type: 'image_url',
          image_url: { url: 'https://cdn.example.com/reference-image.png' },
          role: 'reference_image',
        },
        {
          type: 'video_url',
          video_url: { url: 'https://cdn.example.com/reference-video.mp4' },
          role: 'reference_video',
        },
        {
          type: 'audio_url',
          audio_url: { url: 'https://cdn.example.com/reference-audio.mp3' },
          role: 'reference_audio',
        },
      ],
      callback_url: 'https://mogged.games/api/ai/notify/volcengine',
      return_last_frame: true,
      execution_expires_after: 172800,
      generate_audio: true,
      safety_identifier:
        '5e5c9f2c6e6f0c4b3e1b3c4f5d3d2f8a5a4a0e0f4e7d6c5b4a39281716151413',
      tools: [{ type: 'web_search' }],
      resolution: '720p',
      ratio: 'adaptive',
      duration: 11,
      seed: 42,
      watermark: false,
    });
    expect(result).toMatchObject({
      provider: 'volcengine',
      model: 'doubao-seedance-2-0-fast-260128',
      result: {
        taskId: 'cgt-123',
        taskStatus: AITaskStatus.PENDING,
      },
    });
  });

  it('omits the text content block when image/reference prompts are empty and forwards official controls', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'cgt-789' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new VolcengineSeedanceAdapter();
    await adapter.generate({
      apiKey: 've-secret',
      request: {
        scene: 'image-to-video',
        fast: false,
        prompt: '',
        duration: 4,
        executionExpiresAfter: 7200,
        resolution: '480p',
        aspectRatio: '16:9',
        generateAudio: false,
        webSearch: false,
        seed: undefined,
        safetyIdentifier: 'seedance-cli-smoke-user',
        watermark: true,
        imageUrls: ['https://cdn.example.com/first-frame.png'],
        videoUrls: [],
        audioUrls: [],
        returnLastFrame: false,
      },
      callbackUrl: 'https://mogged.games/api/ai/notify/volcengine',
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      model: 'doubao-seedance-2-0-260128',
      content: [
        {
          type: 'image_url',
          image_url: { url: 'https://cdn.example.com/first-frame.png' },
          role: 'first_frame',
        },
      ],
      callback_url: 'https://mogged.games/api/ai/notify/volcengine',
      execution_expires_after: 7200,
      generate_audio: false,
      safety_identifier: 'seedance-cli-smoke-user',
      resolution: '480p',
      ratio: '16:9',
      duration: 4,
      watermark: true,
    });
  });

  it('maps successful task queries back into internal task envelopes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'cgt-123',
            model: 'doubao-seedance-2-0-260128',
            status: 'succeeded',
            content: {
              video_url: 'https://cdn.example.com/output.mp4',
              last_frame_url: 'https://cdn.example.com/output-last-frame.png',
            },
            created_at: 1743414619,
            updated_at: 1743414673,
            resolution: '720p',
            ratio: '16:9',
            duration: 5,
            generate_audio: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new VolcengineSeedanceAdapter();
    const result = await adapter.query({
      apiKey: 've-secret',
      taskId: 'cgt-123',
      model: 'doubao-seedance-2-0-260128',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/cgt-123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer ve-secret',
        }),
      })
    );
    expect(result.taskStatus).toBe(AITaskStatus.SUCCESS);
    expect(result.taskInfo?.status).toBe('succeeded');
    expect(result.taskInfo?.videos?.[0]?.videoUrl).toBe(
      'https://cdn.example.com/output.mp4'
    );
    expect(result.taskInfo?.images?.[0]?.imageUrl).toBe(
      'https://cdn.example.com/output-last-frame.png'
    );
  });

  it('treats expired official tasks as failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'cgt-456',
            status: 'expired',
            error: {
              code: 'TaskExpired',
              message: 'task exceeded execution timeout',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new VolcengineSeedanceAdapter();
    const result = await adapter.query({
      apiKey: 've-secret',
      taskId: 'cgt-456',
      model: 'doubao-seedance-2-0-fast-260128',
    });

    expect(result.taskStatus).toBe(AITaskStatus.FAILED);
    expect(result.taskInfo?.status).toBe('expired');
    expect(result.taskInfo?.errorCode).toBe('TaskExpired');
    expect(result.taskInfo?.errorMessage).toBe(
      'task exceeded execution timeout'
    );
  });
});
