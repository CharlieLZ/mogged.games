import type {
  ImageEditMode,
  ImageModelKey,
} from '@/shared/blocks/generator/image-generator-config';
import {
  DEFAULT_IMAGE_ASPECT_RATIO,
  DEFAULT_IMAGE_EDIT_MODE,
  DEFAULT_IMAGE_OUTPUT_FORMAT,
  DEFAULT_IMAGE_RESOLUTION,
  findImageModelKeyForModel,
  normalizeImageAspectRatio,
  normalizeImageOutputFormat,
  normalizeImageResolution,
} from '@/shared/blocks/generator/image-generator-config';
import type { ImageGeneratorGuestHistoryItem } from '@/shared/blocks/generator/image-generator-guest-history';
import type { ImageGeneratorMode } from '@/shared/blocks/generator/image-generator-mode';
import type { VideoGeneratorPreviewMediaItem } from '@/shared/blocks/generator/video-generator-preview-state';
import { AITaskStatus } from '@/extensions/ai/types';
import { collectAITaskVisibleMediaItems } from '@/shared/lib/ai-task-visible-media';
import type { AITask } from '@/shared/models/ai_task';

export const IMAGE_TASK_HISTORY_LIMIT = 8;

export type ImageTaskHistoryStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'canceled';

export type ImageTaskHistoryEntry = {
  id: string;
  createdAt: string;
  status: ImageTaskHistoryStatus;
  mode: ImageGeneratorMode;
  prompt: string;
  media: VideoGeneratorPreviewMediaItem[];
  sourceImageUrls: string[];
  imageEditMode: ImageEditMode;
  imageResolution: string;
  imageAspectRatio: string;
  imageOutputFormat: string;
  model?: string;
  modelKey?: ImageModelKey;
  provider?: string;
  isGuest: boolean;
};

export type ImageTaskHistorySnapshot = {
  items: ImageTaskHistoryEntry[];
  total: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function getRecordString(
  record: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getRecordStringArray(
  record: Record<string, unknown>,
  keys: string[]
): string[] {
  const values: string[] = [];

  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      values.push(value.trim());
      continue;
    }

    if (Array.isArray(value)) {
      values.push(
        ...value
          .map((item) =>
            typeof item === 'string' && item.trim() ? item.trim() : ''
          )
          .filter(Boolean)
      );
    }
  }

  return Array.from(new Set(values));
}

function normalizeHistoryStatus(value?: string | null): ImageTaskHistoryStatus {
  switch (value) {
    case AITaskStatus.PENDING:
      return 'pending';
    case AITaskStatus.PROCESSING:
      return 'processing';
    case AITaskStatus.FAILED:
      return 'failed';
    case AITaskStatus.CANCELED:
      return 'canceled';
    case AITaskStatus.SUCCESS:
    case 'succeeded':
    case 'completed':
    case 'complete':
      return 'success';
    default:
      return 'processing';
  }
}

function normalizeCreatedAt(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return new Date().toISOString();
}

function mapTaskMedia(
  taskId: string,
  media: ReturnType<typeof collectAITaskVisibleMediaItems>,
  task: Pick<AITask, 'model' | 'prompt' | 'provider'>
): VideoGeneratorPreviewMediaItem[] {
  return media
    .filter(
      (item): item is typeof item & { type: 'image' | 'video' } =>
        item.type === 'image' || item.type === 'video'
    )
    .map((item, index) => ({
      id: item.id || `${taskId}-media-${index + 1}`,
      url: item.url,
      type: item.type,
      mimeType: item.mimeType,
      model: task.model || undefined,
      prompt: task.prompt || undefined,
      provider: task.provider || undefined,
    }));
}

function parseImageTaskOptions(options: unknown) {
  if (!isRecord(options)) {
    return {
      sourceImageUrls: [] as string[],
      imageEditMode: DEFAULT_IMAGE_EDIT_MODE,
      imageResolution: DEFAULT_IMAGE_RESOLUTION,
      imageAspectRatio: DEFAULT_IMAGE_ASPECT_RATIO,
      imageOutputFormat: DEFAULT_IMAGE_OUTPUT_FORMAT,
    };
  }

  const sourceImageUrls = getRecordStringArray(options, [
    'image_urls',
    'imageUrls',
    'reference_image_urls',
    'referenceImageUrls',
  ]);
  const primarySourceImageUrl = getRecordString(options, [
    'image_url',
    'imageUrl',
    'image',
  ]);
  const nextSourceImageUrls =
    sourceImageUrls.length > 0
      ? sourceImageUrls
      : primarySourceImageUrl
        ? [primarySourceImageUrl]
        : [];
  const rawEditMode = getRecordString(options, ['edit_mode', 'editMode']);

  return {
    sourceImageUrls: nextSourceImageUrls,
    imageEditMode:
      rawEditMode === 'multi-fusion' ? 'multi-fusion' : DEFAULT_IMAGE_EDIT_MODE,
    imageResolution: normalizeImageResolution(
      getRecordString(options, ['resolution'])
    ),
    imageAspectRatio: normalizeImageAspectRatio(
      getRecordString(options, ['aspect_ratio', 'aspectRatio'])
    ),
    imageOutputFormat: normalizeImageOutputFormat(
      getRecordString(options, ['output_format', 'outputFormat'])
    ),
  };
}

function inferGuestHistoryStatus(
  item: ImageGeneratorGuestHistoryItem
): ImageTaskHistoryStatus {
  return item.url ? 'success' : 'processing';
}

export function formatImageTaskHistoryTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (part: number) => part.toString().padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('/') +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function mapAITaskToImageTaskHistoryEntry(
  task: AITask
): ImageTaskHistoryEntry | null {
  const mode =
    task.scene === 'image-to-image' ? 'image-to-image' : 'text-to-image';
  const media = mapTaskMedia(
    task.id,
    collectAITaskVisibleMediaItems({
      status: task.status,
      taskInfo: task.taskInfo,
      taskResult: task.taskResult,
    }),
    task
  );
  const parsedOptions = parseImageTaskOptions(task.options);

  return {
    id: task.id,
    createdAt: normalizeCreatedAt(task.createdAt),
    status: normalizeHistoryStatus(task.status),
    mode,
    prompt: toNonEmptyString(task.prompt),
    media,
    sourceImageUrls: parsedOptions.sourceImageUrls,
    imageEditMode: parsedOptions.imageEditMode,
    imageResolution: parsedOptions.imageResolution,
    imageAspectRatio: parsedOptions.imageAspectRatio,
    imageOutputFormat: parsedOptions.imageOutputFormat,
    model: toNonEmptyString(task.model) || undefined,
    modelKey: findImageModelKeyForModel(task.model, mode),
    provider: toNonEmptyString(task.provider) || undefined,
    isGuest: false,
  };
}

export function mapGuestHistoryItemToImageTaskHistoryEntry(
  item: ImageGeneratorGuestHistoryItem & {
    imageEditMode?: ImageEditMode;
    imageResolution?: string;
    imageAspectRatio?: string;
    imageOutputFormat?: string;
    sourceImageUrls?: string[];
  }
): ImageTaskHistoryEntry {
  const sourceImageUrls = Array.isArray(item.sourceImageUrls)
    ? item.sourceImageUrls.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      )
    : [];

  return {
    id: item.id,
    createdAt: normalizeCreatedAt(item.createdAt),
    status: inferGuestHistoryStatus(item),
    mode: item.mode,
    prompt: toNonEmptyString(item.prompt),
    media: [
      {
        id: item.id,
        url: item.url,
        type: 'image',
        mimeType: item.mimeType,
        model: item.model,
        prompt: item.prompt,
        provider: item.provider,
      },
    ],
    sourceImageUrls,
    imageEditMode:
      item.imageEditMode === 'multi-fusion'
        ? 'multi-fusion'
        : DEFAULT_IMAGE_EDIT_MODE,
    imageResolution: normalizeImageResolution(item.imageResolution),
    imageAspectRatio: normalizeImageAspectRatio(item.imageAspectRatio),
    imageOutputFormat: normalizeImageOutputFormat(item.imageOutputFormat),
    model: item.model,
    modelKey: findImageModelKeyForModel(item.model, item.mode),
    provider: item.provider,
    isGuest: true,
  };
}
