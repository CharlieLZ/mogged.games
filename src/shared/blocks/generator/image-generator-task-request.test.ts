import { describe, expect, it } from 'vitest';

import { AIMediaType } from '@/extensions/ai/types';

import {
  ACTIVE_IMAGE_GENERATOR_TASK_STORAGE_KEY,
  buildImageGeneratorRequestOptions,
  estimateImageGeneratorTaskRuntime,
} from './image-generator-task-request';

describe('image-generator-task-request', () => {
  it('uses a dedicated storage key for active image generator tasks', () => {
    expect(ACTIVE_IMAGE_GENERATOR_TASK_STORAGE_KEY).toBe(
      'imageeditorai:image-generator:active-task'
    );
  });

  it('builds provider-safe request options for text-to-image and image-to-image', () => {
    expect(
      buildImageGeneratorRequestOptions({
        mode: 'text-to-image',
        model: 'gpt-image-2-text-to-image',
        imageEditMode: 'single-edit',
        imageResolution: '2K',
        imageAspectRatio: '4:5',
        imageOutputFormat: 'png',
        webSearch: true,
        imageUrls: ['https://cdn.example.com/ignored.png'],
      })
    ).toEqual({
      aspect_ratio: '4:5',
      resolution: '2K',
      output_format: 'png',
      web_search: true,
    });

    expect(
      buildImageGeneratorRequestOptions({
        mode: 'image-to-image',
        model: 'nano-banana-2',
        imageEditMode: 'multi-fusion',
        imageResolution: '4K',
        imageAspectRatio: '1:1',
        imageOutputFormat: 'jpg',
        webSearch: false,
        imageUrls: [
          'https://cdn.example.com/source.png',
          'https://cdn.example.com/reference.png',
        ],
      })
    ).toEqual({
      aspect_ratio: '1:1',
      resolution: '4K',
      output_format: 'jpg',
      web_search: false,
      image_url: 'https://cdn.example.com/source.png',
      image_urls: [
        'https://cdn.example.com/source.png',
        'https://cdn.example.com/reference.png',
      ],
      edit_mode: 'multi-fusion',
    });
  });

  it('estimates runtime for image scenes with image media output', () => {
    expect(
      estimateImageGeneratorTaskRuntime({
        scene: 'text-to-image',
        mode: 'text-to-image',
        imageResolution: '1K',
      })
    ).toEqual({
      mediaType: AIMediaType.IMAGE,
      estimatedSeconds: 45,
      videoDuration: null,
    });

    expect(
      estimateImageGeneratorTaskRuntime({
        scene: 'image-to-image',
        mode: 'image-to-image',
        imageResolution: '2K',
      })
    ).toEqual({
      mediaType: AIMediaType.IMAGE,
      estimatedSeconds: 80,
      videoDuration: null,
    });
  });
});
