import type { ImageGeneratorMode } from './image-generator-mode';
import { getImageSampleMedia } from './image-sample-media';
import { getGeneratorSampleMedia } from './sample-media';
import { isVideoGeneratorMode, type VideoGeneratorMode } from './video-generator-mode';

type GeneratorPreviewMode = VideoGeneratorMode | ImageGeneratorMode;

export interface VideoGeneratorPreviewMediaItem {
  id: string;
  url: string;
  provider?: string;
  model?: string;
  prompt?: string;
  type: 'image' | 'video';
  mimeType?: string;
  posterUrl?: string;
  alt?: string;
  aspectRatio?: 'landscape' | 'portrait';
  isSample?: boolean;
}

type VideoGeneratorPreviewStateInput = {
  mode: GeneratorPreviewMode;
  locale?: string;
  generatedMedia: VideoGeneratorPreviewMediaItem[];
  isGenerating: boolean;
  showSamplePreview: boolean;
};

export function getVideoGeneratorPreviewState({
  mode,
  locale,
  generatedMedia,
  isGenerating,
  showSamplePreview,
}: VideoGeneratorPreviewStateInput) {
  const sampleMedia = showSamplePreview
    ? isVideoGeneratorMode(mode)
      ? ([...getGeneratorSampleMedia(mode, locale)] as VideoGeneratorPreviewMediaItem[])
      : ([...getImageSampleMedia(mode, locale)] as VideoGeneratorPreviewMediaItem[])
    : [];
  const showingSampleMedia =
    showSamplePreview &&
    !isGenerating &&
    generatedMedia.length === 0 &&
    sampleMedia.length > 0;

  return {
    showingSampleMedia,
    previewMedia: showingSampleMedia ? sampleMedia : generatedMedia,
  };
}
