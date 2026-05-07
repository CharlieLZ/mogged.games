import type { ImageGeneratorMode } from './image-generator-mode';
import type { VideoGeneratorPreviewMediaItem } from './video-generator-preview-state';

export const IMAGE_GENERATOR_GUEST_HISTORY_STORAGE_KEY =
  'imageeditorai:image-generator:guest-history:v1';
export const IMAGE_GENERATOR_GUEST_HISTORY_LIMIT = 12;

export type ImageGeneratorGuestHistoryItem = {
  id: string;
  url: string;
  mode: ImageGeneratorMode;
  createdAt: string;
  mimeType?: string;
  model?: string;
  prompt?: string;
  provider?: string;
  imageEditMode?: 'single-edit' | 'multi-fusion';
  imageResolution?: string;
  imageAspectRatio?: string;
  imageOutputFormat?: string;
  sourceImageUrls?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeHistoryItem(
  value: unknown
): ImageGeneratorGuestHistoryItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = toOptionalString(value.id);
  const url = toOptionalString(value.url);
  const createdAt = toOptionalString(value.createdAt);
  const mode =
    value.mode === 'image-to-image' || value.mode === 'text-to-image'
      ? value.mode
      : null;

  if (!id || !url || !createdAt || !mode) {
    return null;
  }

  return {
    id,
    url,
    mode,
    createdAt,
    mimeType: toOptionalString(value.mimeType),
    model: toOptionalString(value.model),
    prompt: toOptionalString(value.prompt),
    provider: toOptionalString(value.provider),
    imageEditMode:
      value.imageEditMode === 'multi-fusion' ? 'multi-fusion' : 'single-edit',
    imageResolution: toOptionalString(value.imageResolution),
    imageAspectRatio: toOptionalString(value.imageAspectRatio),
    imageOutputFormat: toOptionalString(value.imageOutputFormat),
    sourceImageUrls: Array.isArray(value.sourceImageUrls)
      ? value.sourceImageUrls.filter(
          (item): item is string =>
            typeof item === 'string' && item.trim().length > 0
        )
      : undefined,
  };
}

export function parseImageGeneratorGuestHistory(raw: string | null) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeHistoryItem)
      .filter((item): item is ImageGeneratorGuestHistoryItem => Boolean(item))
      .slice(0, IMAGE_GENERATOR_GUEST_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function readImageGeneratorGuestHistory(storage: Storage) {
  return parseImageGeneratorGuestHistory(
    storage.getItem(IMAGE_GENERATOR_GUEST_HISTORY_STORAGE_KEY)
  );
}

export function writeImageGeneratorGuestHistory(
  storage: Storage,
  items: ImageGeneratorGuestHistoryItem[]
) {
  const normalized = items
    .map(normalizeHistoryItem)
    .filter((item): item is ImageGeneratorGuestHistoryItem => Boolean(item))
    .slice(0, IMAGE_GENERATOR_GUEST_HISTORY_LIMIT);

  storage.setItem(
    IMAGE_GENERATOR_GUEST_HISTORY_STORAGE_KEY,
    JSON.stringify(normalized)
  );

  return normalized;
}

export function appendImageGeneratorGuestHistory(
  currentItems: ImageGeneratorGuestHistoryItem[],
  mediaItems: VideoGeneratorPreviewMediaItem[],
  options: {
    createdAt?: Date;
    mode: ImageGeneratorMode;
    prompt: string;
    imageEditMode?: 'single-edit' | 'multi-fusion';
    imageResolution?: string;
    imageAspectRatio?: string;
    imageOutputFormat?: string;
    sourceImageUrls?: string[];
  }
) {
  const createdAt = (options.createdAt || new Date()).toISOString();
  const additions = mediaItems
    .filter((item) => item.type === 'image' && !item.isSample && item.url)
    .map((item) => ({
      id: item.id,
      url: item.url,
      mode: options.mode,
      createdAt,
      mimeType: item.mimeType,
      model: item.model,
      prompt: item.prompt || options.prompt,
      provider: item.provider,
      imageEditMode: options.imageEditMode,
      imageResolution: options.imageResolution,
      imageAspectRatio: options.imageAspectRatio,
      imageOutputFormat: options.imageOutputFormat,
      sourceImageUrls: options.sourceImageUrls,
    }));

  if (additions.length === 0) {
    return currentItems.slice(0, IMAGE_GENERATOR_GUEST_HISTORY_LIMIT);
  }

  const seen = new Set<string>();

  return [...additions, ...currentItems]
    .filter((item) => {
      const key = item.id || item.url;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, IMAGE_GENERATOR_GUEST_HISTORY_LIMIT);
}

export function clearImageGeneratorGuestHistory(storage: Storage) {
  storage.removeItem(IMAGE_GENERATOR_GUEST_HISTORY_STORAGE_KEY);
}
