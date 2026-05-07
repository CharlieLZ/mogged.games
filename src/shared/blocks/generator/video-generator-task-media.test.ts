import { describe, expect, it, vi } from 'vitest';

import {
  extractVideoGeneratorMediaItems,
  mapVideoGeneratorTaskMedia,
  parseVideoGeneratorTaskResult,
  resolveVideoGeneratorTaskMedia,
} from './video-generator-task-media';

describe('image-task-media', () => {
  it('parses JSON task results and falls back to null on invalid payloads', () => {
    expect(
      parseVideoGeneratorTaskResult('{"images":["https://a.com/a.png"]}')
    ).toEqual({ images: ['https://a.com/a.png'] });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseVideoGeneratorTaskResult('{bad json')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('extracts and deduplicates image and video outputs', () => {
    const media = extractVideoGeneratorMediaItems({
      video: 'https://cdn.example.com/clip.mp4',
      images: [
        'https://cdn.example.com/frame.png',
        { url: 'https://cdn.example.com/frame.png' },
      ],
      output: [
        {
          imageUrl: 'https://cdn.example.com/final.webp',
          contentType: 'image/webp',
        },
      ],
    });

    expect(media).toEqual([
      {
        id: '',
        url: 'https://cdn.example.com/clip.mp4',
        type: 'video',
        mimeType: undefined,
      },
      {
        id: '',
        url: 'https://cdn.example.com/frame.png',
        type: 'image',
        mimeType: undefined,
      },
      {
        id: '',
        url: 'https://cdn.example.com/final.webp',
        type: 'image',
        mimeType: 'image/webp',
      },
    ]);
  });

  it('maps extracted media back onto task metadata', () => {
    const media = mapVideoGeneratorTaskMedia(
      {
        id: 'task_123',
        provider: 'studio',
        model: 'legacy-model',
        prompt: 'cinematic skyline',
      },
      {
        output: [
          { url: 'https://cdn.example.com/one.png' },
          { url: 'https://cdn.example.com/two.mp4', type: 'video/mp4' },
        ],
      }
    );

    expect(media).toEqual([
      {
        id: 'task_123-0',
        url: 'https://cdn.example.com/one.png',
        type: 'image',
        mimeType: undefined,
        provider: 'studio',
        model: 'legacy-model',
        prompt: 'cinematic skyline',
      },
      {
        id: 'task_123-1',
        url: 'https://cdn.example.com/two.mp4',
        type: 'video',
        mimeType: 'video/mp4',
        provider: 'studio',
        model: 'legacy-model',
        prompt: 'cinematic skyline',
      },
    ]);
  });

  it('extracts media from nested Volcengine task payloads', () => {
    const media = extractVideoGeneratorMediaItems({
      id: 'cgt-123',
      status: 'succeeded',
      content: {
        video_url: 'https://ark.example.com/output.mp4',
        last_frame_url: 'https://ark.example.com/last-frame.png',
      },
    });

    expect(media).toEqual([
      {
        id: '',
        url: 'https://ark.example.com/output.mp4',
        type: 'video',
        mimeType: undefined,
      },
      {
        id: '',
        url: 'https://ark.example.com/last-frame.png',
        type: 'image',
        mimeType: undefined,
      },
    ]);
  });

  it('prefers normalized taskInfo media over raw provider payload URLs', () => {
    const media = resolveVideoGeneratorTaskMedia({
      id: 'task_456',
      provider: 'volcengine',
      model: 'doubao-seedance-2-0-fast-260128',
      prompt: 'cinematic skyline',
      taskInfo: {
        videos: [
          {
            videoUrl: 'https://cdn.example.com/persistent-output.mp4',
          },
        ],
      },
      taskResult: {
        content: {
          video_url: 'https://ark.example.com/temporary-output.mp4',
        },
      },
    });

    expect(media).toEqual([
      {
        id: 'task_456-0',
        url: 'https://cdn.example.com/persistent-output.mp4',
        type: 'video',
        mimeType: undefined,
        provider: 'volcengine',
        model: 'doubao-seedance-2-0-fast-260128',
        prompt: 'cinematic skyline',
      },
    ]);
  });
});
