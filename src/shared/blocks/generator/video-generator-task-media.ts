import type { VideoGeneratorPreviewMediaItem } from './video-generator-preview-state';
import {
  extractAITaskMediaItems,
  parseAITaskMediaPayload,
} from '@/shared/lib/ai-task-media';

export interface VideoGeneratorBackendTask {
  id: string;
  status: string;
  provider: string;
  model: string;
  prompt: string | null;
  taskInfo?: string | Record<string, unknown> | null;
  taskResult: string | Record<string, unknown> | null;
}

type VideoGeneratorTaskMediaSource = Pick<
  VideoGeneratorBackendTask,
  'id' | 'provider' | 'model' | 'prompt' | 'taskInfo' | 'taskResult'
>;

export function parseVideoGeneratorTaskResult(
  taskResult: string | Record<string, unknown> | null
) {
  return parseAITaskMediaPayload(taskResult);
}

export function extractVideoGeneratorMediaItems(
  result: unknown
): VideoGeneratorPreviewMediaItem[] {
  return extractAITaskMediaItems(result).filter(
    (
      item
    ): item is VideoGeneratorPreviewMediaItem & { id: string } =>
      item.type === 'image' || item.type === 'video'
  );
}

export function mapVideoGeneratorTaskMedia(
  task: Pick<VideoGeneratorBackendTask, 'id' | 'provider' | 'model' | 'prompt'>,
  result: unknown
) {
  return extractVideoGeneratorMediaItems(result).map((item, index) => ({
    ...item,
    id: `${task.id}-${index}`,
    provider: task.provider,
    model: task.model,
    prompt: task.prompt ?? undefined,
  }));
}

export function resolveVideoGeneratorTaskMedia(
  task: VideoGeneratorTaskMediaSource
) {
  const normalizedTaskInfo = parseVideoGeneratorTaskResult(task.taskInfo ?? null);
  const taskInfoMedia = mapVideoGeneratorTaskMedia(task, normalizedTaskInfo);
  if (taskInfoMedia.length > 0) {
    return taskInfoMedia;
  }

  const normalizedTaskResult = parseVideoGeneratorTaskResult(
    task.taskResult ?? null
  );
  return mapVideoGeneratorTaskMedia(task, normalizedTaskResult);
}
