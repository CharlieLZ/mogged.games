import { describe, expect, it } from 'vitest';

import { getVideoGeneratorPreviewState } from './video-generator-preview-state';

describe('image-preview', () => {
  it('uses the two portrait sample videos when the landing preview should prime an empty state', () => {
    const result = getVideoGeneratorPreviewState({
      mode: 'text-to-video',
      generatedMedia: [],
      isGenerating: false,
      showSamplePreview: true,
    });

    expect(result.showingSampleMedia).toBe(true);
    expect(result.previewMedia).toHaveLength(2);
    expect(result.previewMedia.map((item) => item.id)).toEqual([
      'sample-text-to-video-vertical-1',
      'sample-text-to-video-vertical-2',
    ]);
    expect(result.previewMedia.map((item) => item.aspectRatio)).toEqual([
      'portrait',
      'portrait',
    ]);
    expect(result.previewMedia.every((item) => item.isSample)).toBe(true);
  });

  it('keeps real outputs ahead of sample media', () => {
    const result = getVideoGeneratorPreviewState({
      mode: 'text-to-video',
      generatedMedia: [
        {
          id: 'task-1',
          url: 'https://example.com/output.mp4',
          type: 'video',
          prompt: 'real output',
        },
      ],
      isGenerating: false,
      showSamplePreview: true,
    });

    expect(result.showingSampleMedia).toBe(false);
    expect(result.previewMedia).toEqual([
      {
        id: 'task-1',
        url: 'https://example.com/output.mp4',
        type: 'video',
        prompt: 'real output',
      },
    ]);
  });

  it('hides samples while a generation is actively running', () => {
    const result = getVideoGeneratorPreviewState({
      mode: 'image-to-video',
      generatedMedia: [],
      isGenerating: true,
      showSamplePreview: true,
    });

    expect(result.showingSampleMedia).toBe(false);
    expect(result.previewMedia).toEqual([]);
  });

  it('uses uploaded preview images for text-to-image and image-to-image empty states', () => {
    const textToImage = getVideoGeneratorPreviewState({
      mode: 'text-to-image',
      generatedMedia: [],
      isGenerating: false,
      showSamplePreview: true,
    });
    const imageToImage = getVideoGeneratorPreviewState({
      mode: 'image-to-image',
      generatedMedia: [],
      isGenerating: false,
      showSamplePreview: true,
    });

    expect(textToImage.showingSampleMedia).toBe(true);
    expect(textToImage.previewMedia.map((item) => item.url)).toEqual([
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/TextRendering.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/StyleTransfer.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/WorldKnowledgeModel.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/4k.webp',
    ]);
    expect(textToImage.previewMedia.every((item) => item.isSample)).toBe(true);

    expect(imageToImage.showingSampleMedia).toBe(true);
    expect(imageToImage.previewMedia.map((item) => item.url)).toEqual([
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/StyleTransfer.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/TextRendering.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/WorldKnowledgeModel.webp',
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/4k.webp',
    ]);
    expect(imageToImage.previewMedia.every((item) => item.isSample)).toBe(true);
  });
});
