import { describe, expect, it } from 'vitest';

import { collectAITaskVisibleMediaItems } from './ai-task-visible-media';

describe('collectAITaskVisibleMediaItems', () => {
  it('does not treat raw non-success provider payload urls as visible results', () => {
    const media = collectAITaskVisibleMediaItems({
      status: 'processing',
      taskInfo: { status: 'processing' },
      taskResult: {
        url: 'https://cdn.example.com/source-input.png',
        payload: {
          imageUrl: 'https://cdn.example.com/reference.png',
        },
      },
    });

    expect(media).toEqual([]);
  });

  it('prefers normalized taskInfo media over raw taskResult media', () => {
    const media = collectAITaskVisibleMediaItems({
      status: 'success',
      taskInfo: {
        videos: [{ videoUrl: 'https://cdn.example.com/final.mp4' }],
      },
      taskResult: {
        content: {
          video_url: 'https://provider.example.com/temporary.mp4',
        },
      },
    });

    expect(media).toEqual([
      {
        id: '',
        url: 'https://cdn.example.com/final.mp4',
        type: 'video',
        mimeType: undefined,
      },
    ]);
  });

  it('falls back to taskResult media for successful tasks without taskInfo media', () => {
    const media = collectAITaskVisibleMediaItems({
      status: 'success',
      taskInfo: { status: 'succeeded' },
      taskResult: {
        data: {
          result: {
            imageUrl: 'https://cdn.example.com/output.png',
          },
        },
      },
    });

    expect(media).toEqual([
      {
        id: '',
        url: 'https://cdn.example.com/output.png',
        type: 'image',
        mimeType: undefined,
      },
    ]);
  });

  it('filters provider queue urls from visible media', () => {
    const media = collectAITaskVisibleMediaItems({
      status: 'success',
      taskInfo: {
        output: [
          { url: 'https://queue.fal.run/fal-ai/example/requests/abc' },
          { url: 'https://cdn.example.com/output.webp' },
        ],
      },
      taskResult: null,
    });

    expect(media).toEqual([
      {
        id: '',
        url: 'https://cdn.example.com/output.webp',
        type: 'image',
        mimeType: undefined,
      },
    ]);
  });
});
