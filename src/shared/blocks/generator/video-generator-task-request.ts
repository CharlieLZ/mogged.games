import {
  getGenerationSceneMediaType,
  type AIGenerationScene,
} from '@/config/ai-model-registry';
import { AIMediaType } from '@/extensions/ai/types';

import type { VideoGeneratorMode } from './video-generator-mode';
import {
  buildVideoGenerationOptions,
  estimateVideoGenerationSeconds,
  normalizeVideoDurationSeconds,
} from './video-generator-config';

export interface PersistedVideoGeneratorTask {
  id: string;
  mediaType: AIMediaType | null;
  startTime?: number;
}

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem'>;
type StorageRemover = Pick<Storage, 'removeItem'>;

export type VideoGeneratorTaskRequestInput = {
  mode: VideoGeneratorMode;
  seed: string;
  videoDurationSeconds: string;
  videoResolution: string;
  videoAspectRatio: string;
  fast: boolean;
  generateAudio: boolean;
  webSearch: boolean;
  returnLastFrame: boolean;
  imageUrls: string[];
  videoUrls: string[];
  audioUrls: string[];
};

type VideoGeneratorRuntimeInput = Pick<
  VideoGeneratorTaskRequestInput,
  'mode' | 'videoDurationSeconds' | 'videoResolution' | 'fast'
> & {
  scene: AIGenerationScene;
};

export const ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY =
  'imageeditorai:generator:active-task';

export function parseVideoGeneratorSeed(seed: string) {
  const trimmed = seed.trim();
  if (!trimmed) {
    return undefined;
  }

  const numericSeed = Number(trimmed);
  return Number.isNaN(numericSeed) ? undefined : numericSeed;
}

export function buildVideoGeneratorRequestOptions({
  mode,
  seed,
  videoDurationSeconds,
  videoResolution,
  videoAspectRatio,
  fast,
  generateAudio,
  webSearch,
  returnLastFrame,
  imageUrls,
  videoUrls,
  audioUrls,
}: VideoGeneratorTaskRequestInput) {
  const numericSeed = parseVideoGeneratorSeed(seed);

  return buildVideoGenerationOptions({
    mode,
    durationSeconds: videoDurationSeconds,
    resolution: videoResolution,
    aspectRatio: videoAspectRatio,
    fast,
    generateAudio,
    webSearch,
    returnLastFrame,
    numericSeed,
    imageUrls,
    videoUrls,
    audioUrls,
  });
}

export function estimateVideoGeneratorTaskRuntime({
  scene,
  mode,
  videoDurationSeconds,
  videoResolution,
  fast,
}: VideoGeneratorRuntimeInput) {
  const mediaType = getGenerationSceneMediaType(scene);

  return {
    mediaType,
    estimatedSeconds: estimateVideoGenerationSeconds({
      mode,
      durationSeconds: videoDurationSeconds,
      resolution: videoResolution,
      fast,
    }),
    videoDuration: Number(normalizeVideoDurationSeconds(videoDurationSeconds)),
  };
}

export function parsePersistedVideoGeneratorTask(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedVideoGeneratorTask | null;
    if (!parsed?.id) {
      return null;
    }

    return {
      id: parsed.id,
      mediaType: parsed.mediaType ?? null,
      startTime:
        typeof parsed.startTime === 'number' ? parsed.startTime : undefined,
    };
  } catch (error) {
    console.warn('restore active task failed', error);
    return null;
  }
}

export function restorePersistedVideoGeneratorTask(storage: StorageReader) {
  return parsePersistedVideoGeneratorTask(
    storage.getItem(ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY)
  );
}

export function persistVideoGeneratorTask(
  storage: StorageWriter,
  task: PersistedVideoGeneratorTask
) {
  storage.setItem(
    ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY,
    JSON.stringify({
      id: task.id,
      mediaType: task.mediaType ?? null,
      startTime: task.startTime ?? Date.now(),
    })
  );
}

export function clearPersistedVideoGeneratorTask(storage: StorageRemover) {
  storage.removeItem(ACTIVE_VIDEO_GENERATOR_TASK_STORAGE_KEY);
}
