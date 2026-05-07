import { describe, expect, it, vi } from 'vitest';

import { AIMediaType } from '@/extensions/ai/types';

import {
  ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY,
  buildVideoGeneratorRequestOptions,
  clearPersistedVideoGeneratorTask,
  estimateVideoGeneratorTaskRuntime,
  parseVideoGeneratorSeed,
  parsePersistedVideoGeneratorTask,
  persistVideoGeneratorTask,
  restorePersistedVideoGeneratorTask,
} from './video-generator-task-request';

describe('image-task-request', () => {
  it('uses the imageeditorai storage key for active generator tasks', () => {
    expect(ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY).toBe(
      'imageeditorai:generator:active-task'
    );
  });

  it('parses numeric seeds and ignores blanks or invalid input', () => {
    expect(parseVideoGeneratorSeed('42')).toBe(42);
    expect(parseVideoGeneratorSeed('')).toBeUndefined();
    expect(parseVideoGeneratorSeed('abc')).toBeUndefined();
  });

  it('builds provider-safe request options for text, image, and reference video modes', () => {
    expect(
      buildVideoGeneratorRequestOptions({
        mode: 'text-to-video',
        seed: '7',
        videoDurationSeconds: '6',
        videoResolution: '720p',
        videoAspectRatio: '16:9',
        fast: true,
        generateAudio: true,
        webSearch: true,
        returnLastFrame: true,
        imageUrls: [],
        videoUrls: [],
        audioUrls: [],
      })
    ).toEqual({
      fast: true,
      duration: 6,
      resolution: '720p',
      aspect_ratio: '16:9',
      generate_audio: true,
      web_search: true,
      return_last_frame: true,
      seed: 7,
    });

    expect(
      buildVideoGeneratorRequestOptions({
        mode: 'image-to-video',
        seed: '11',
        videoDurationSeconds: '8',
        videoResolution: '720p',
        videoAspectRatio: '9:16',
        fast: false,
        generateAudio: false,
        webSearch: false,
        returnLastFrame: false,
        imageUrls: [' https://cdn.example.com/source.png '],
        videoUrls: [],
        audioUrls: [],
      })
    ).toEqual({
      fast: false,
      duration: 8,
      resolution: '720p',
      aspect_ratio: '9:16',
      generate_audio: false,
      web_search: false,
      seed: 11,
      image_urls: [' https://cdn.example.com/source.png '],
    });

    expect(
      buildVideoGeneratorRequestOptions({
        mode: 'reference-to-video',
        seed: '',
        videoDurationSeconds: '10',
        videoResolution: '480p',
        videoAspectRatio: '21:9',
        fast: true,
        generateAudio: true,
        webSearch: false,
        returnLastFrame: true,
        imageUrls: ['https://example.com/one.png'],
        videoUrls: ['https://example.com/ref.mp4'],
        audioUrls: ['https://example.com/ref.mp3'],
      })
    ).toEqual({
      fast: true,
      duration: 10,
      resolution: '480p',
      aspect_ratio: '21:9',
      generate_audio: true,
      web_search: false,
      return_last_frame: true,
      image_urls: ['https://example.com/one.png'],
      video_urls: ['https://example.com/ref.mp4'],
      audio_urls: ['https://example.com/ref.mp3'],
    });
  });

  it('estimates runtime for the unified video-only scenes', () => {
    expect(
      estimateVideoGeneratorTaskRuntime({
        scene: 'text-to-video',
        mode: 'text-to-video',
        videoDurationSeconds: '6',
        videoResolution: '720p',
        fast: false,
      })
    ).toEqual({
      mediaType: AIMediaType.VIDEO,
      estimatedSeconds: 198,
      videoDuration: 6,
    });

    expect(
      estimateVideoGeneratorTaskRuntime({
        scene: 'reference-to-video',
        mode: 'reference-to-video',
        videoDurationSeconds: '6',
        videoResolution: '480p',
        fast: true,
      })
    ).toEqual({
      mediaType: AIMediaType.VIDEO,
      estimatedSeconds: 168,
      videoDuration: 6,
    });

    expect(
      estimateVideoGeneratorTaskRuntime({
        scene: 'text-to-video',
        mode: 'text-to-video',
        videoDurationSeconds: '',
        videoResolution: '720p',
        fast: true,
      })
    ).toEqual({
      mediaType: AIMediaType.VIDEO,
      estimatedSeconds: 240,
      videoDuration: 15,
    });
  });

  it('parses, writes, restores, and clears persisted task snapshots', () => {
    expect(parsePersistedVideoGeneratorTask(null)).toBeNull();
    expect(parsePersistedVideoGeneratorTask('{"startTime":1}')).toBeNull();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parsePersistedVideoGeneratorTask('{bad json')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    const storage = {
      value: null as string | null,
      getItem: vi.fn((key: string) =>
        key === ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY ? storage.value : null
      ),
      setItem: vi.fn((key: string, value: string) => {
        if (key === ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY) {
          storage.value = value;
        }
      }),
      removeItem: vi.fn((key: string) => {
        if (key === ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY) {
          storage.value = null;
        }
      }),
    };

    persistVideoGeneratorTask(storage, {
      id: 'task_1',
      mediaType: AIMediaType.VIDEO,
      startTime: 123,
    });
    expect(restorePersistedVideoGeneratorTask(storage)).toEqual({
      id: 'task_1',
      mediaType: AIMediaType.VIDEO,
      startTime: 123,
    });

    clearPersistedVideoGeneratorTask(storage);
    expect(restorePersistedVideoGeneratorTask(storage)).toBeNull();
  });
});
