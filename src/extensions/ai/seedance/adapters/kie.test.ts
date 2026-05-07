import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';

import { KIESeedanceAdapter } from './kie';

vi.mock('server-only', () => ({}));

describe('KIESeedanceAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the documented create payload for KIE Seedance 2.0', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 200,
          msg: 'success',
          data: {
            taskId: 'task_bytedance_123',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new KIESeedanceAdapter();
    const result = await adapter.generate({
      apiKey: 'kie-secret',
      request: {
        scene: 'reference-to-video',
        fast: false,
        prompt: 'Keep the horse identity and use the reference motion.',
        duration: 15,
        executionExpiresAfter: 172800,
        resolution: '720p',
        aspectRatio: '16:9',
        generateAudio: false,
        webSearch: false,
        watermark: false,
        imageUrls: ['https://cdn.example.com/reference-image.png'],
        videoUrls: ['https://cdn.example.com/reference-video.mp4'],
        audioUrls: ['https://cdn.example.com/reference-audio.mp3'],
        returnLastFrame: true,
      },
      callbackUrl: 'https://mogged.games/api/ai/notify/kie',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.kie.ai/api/v1/jobs/createTask',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer kie-secret',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          model: 'bytedance/seedance-2',
          callBackUrl: 'https://mogged.games/api/ai/notify/kie',
          input: {
            prompt: 'Keep the horse identity and use the reference motion.',
            generate_audio: false,
            resolution: '720p',
            aspect_ratio: '16:9',
            duration: 15,
            web_search: false,
            return_last_frame: true,
            reference_image_urls: [
              'https://cdn.example.com/reference-image.png',
            ],
            reference_video_urls: [
              'https://cdn.example.com/reference-video.mp4',
            ],
            reference_audio_urls: [
              'https://cdn.example.com/reference-audio.mp3',
            ],
          },
        }),
      })
    );
    expect(result).toMatchObject({
      provider: 'kie',
      model: 'bytedance/seedance-2',
      result: {
        taskId: 'task_bytedance_123',
        taskStatus: AITaskStatus.PENDING,
        taskInfo: {
          responseUrl: 'https://api.kie.ai/api/v1/jobs/createTask',
          statusUrl:
            'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=task_bytedance_123',
        },
      },
    });
  });

  it('maps KIE task queries back into internal task envelopes with status urls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 200,
          msg: 'success',
          data: {
            taskId: 'task_bytedance_456',
            state: 'success',
            resultJson: JSON.stringify({
              video_url: 'https://cdn.example.com/output.mp4',
              last_frame_url: 'https://cdn.example.com/output-last-frame.png',
            }),
            createTime: 1_763_000_000,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new KIESeedanceAdapter();
    const result = await adapter.query({
      apiKey: 'kie-secret',
      taskId: 'task_bytedance_456',
      model: 'bytedance/seedance-2-fast',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=task_bytedance_456',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer kie-secret',
        }),
      })
    );
    expect(result.taskStatus).toBe(AITaskStatus.SUCCESS);
    expect(result.taskInfo).toMatchObject({
      status: 'success',
      responseUrl:
        'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=task_bytedance_456',
      statusUrl:
        'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=task_bytedance_456',
    });
    expect(result.taskInfo?.videos?.[0]?.videoUrl).toBe(
      'https://cdn.example.com/output.mp4'
    );
    expect(result.taskInfo?.images?.[0]?.imageUrl).toBe(
      'https://cdn.example.com/output-last-frame.png'
    );
  });
});
