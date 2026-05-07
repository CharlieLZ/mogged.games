import {
  getGenerationSceneMediaType,
  type AIGenerationScene,
} from '@/config/ai-model-registry';
import { AIMediaType } from '@/extensions/ai/types';

import {
  buildImageGenerationOptions,
  estimateImageGenerationSeconds,
} from './image-generator-config';
import type { ImageGeneratorMode } from './image-generator-mode';

export interface PersistedImageGeneratorTask {
  id: string;
  mediaType: AIMediaType | null;
  startTime?: number;
}

export type ImageGeneratorTaskRequestInput = {
  mode: ImageGeneratorMode;
  model?: string;
  imageEditMode?: string;
  imageResolution: string;
  imageAspectRatio: string;
  imageOutputFormat: string;
  webSearch: boolean;
  imageUrls: string[];
};

type ImageGeneratorRuntimeInput = Pick<
  ImageGeneratorTaskRequestInput,
  'mode' | 'imageResolution'
> & {
  scene: AIGenerationScene;
};

export const ACTIVE_IMAGE_GENERATOR_TASK_STORAGE_KEY =
  'imageeditorai:image-generator:active-task';

export function buildImageGeneratorRequestOptions({
  mode,
  imageEditMode,
  imageResolution,
  imageAspectRatio,
  imageOutputFormat,
  webSearch,
  imageUrls,
}: ImageGeneratorTaskRequestInput) {
  return buildImageGenerationOptions({
    mode,
    imageEditMode,
    resolution: imageResolution,
    aspectRatio: imageAspectRatio,
    outputFormat: imageOutputFormat,
    webSearch,
    imageUrls,
  });
}

export function estimateImageGeneratorTaskRuntime({
  scene,
  mode,
  imageResolution,
}: ImageGeneratorRuntimeInput) {
  return {
    mediaType: getGenerationSceneMediaType(scene),
    estimatedSeconds: estimateImageGenerationSeconds({
      mode,
      resolution: imageResolution,
    }),
    videoDuration: null,
  };
}
