export type AITaskMediaKind = 'image' | 'audio' | 'video';

export interface AITaskMediaItem {
  id: string;
  url: string;
  type: AITaskMediaKind;
  mimeType?: string;
}

function getString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function detectMediaType(
  url: string,
  mimeType?: string
): AITaskMediaItem['type'] {
  const normalizedMimeType = mimeType?.toLowerCase();
  if (normalizedMimeType?.startsWith('video')) {
    return 'video';
  }

  if (normalizedMimeType?.startsWith('audio')) {
    return 'audio';
  }

  const lowerUrl = url.toLowerCase();
  if (
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.mov') ||
    lowerUrl.endsWith('.gif')
  ) {
    return 'video';
  }

  if (
    lowerUrl.endsWith('.mp3') ||
    lowerUrl.endsWith('.wav') ||
    lowerUrl.endsWith('.m4a') ||
    lowerUrl.endsWith('.aac') ||
    lowerUrl.endsWith('.ogg')
  ) {
    return 'audio';
  }

  return 'image';
}

export function parseAITaskMediaPayload(
  taskResult: string | Record<string, unknown> | null | undefined
) {
  if (!taskResult) {
    return null;
  }

  if (typeof taskResult === 'object') {
    return taskResult;
  }

  try {
    return JSON.parse(taskResult);
  } catch (error) {
    console.warn('Failed to parse ai task media payload:', error);
    return null;
  }
}

export function extractAITaskMediaItems(result: unknown): AITaskMediaItem[] {
  if (!result) {
    return [];
  }

  const media: AITaskMediaItem[] = [];
  const seen = new Set<string>();
  const visited = new WeakSet<object>();

  const addMedia = (
    url: string | undefined,
    type?: AITaskMediaItem['type'],
    mimeType?: string
  ) => {
    if (!url || seen.has(url)) {
      return;
    }

    media.push({
      id: '',
      url,
      type: type ?? detectMediaType(url, mimeType),
      mimeType,
    });
    seen.add(url);
  };

  const visit = (
    item: unknown,
    fallbackType?: AITaskMediaItem['type']
  ) => {
    if (!item) {
      return;
    }

    if (typeof item === 'string') {
      addMedia(item, fallbackType);
      return;
    }

    if (typeof item !== 'object') {
      return;
    }

    if (visited.has(item)) {
      return;
    }
    visited.add(item);

    if (Array.isArray(item)) {
      item.forEach((entry) => visit(entry, fallbackType));
      return;
    }

    const record = item as Record<string, unknown>;
    const mimeType =
      getString(record.content_type) ||
      getString(record.contentType) ||
      getString(record.mime_type) ||
      getString(record.mimeType) ||
      getString(record.type);
    const derivedType =
      fallbackType ||
      (record.video || record.video_url || record.videoUrl
        ? 'video'
        : record.audio || record.audio_url || record.audioUrl
          ? 'audio'
          : undefined);

    addMedia(getString(record.video), 'video', mimeType);
    addMedia(getString(record.video_url), 'video', mimeType);
    addMedia(getString(record.videoUrl), 'video', mimeType);
    addMedia(getString(record.audio), 'audio', mimeType);
    addMedia(getString(record.audio_url), 'audio', mimeType);
    addMedia(getString(record.audioUrl), 'audio', mimeType);
    addMedia(getString(record.last_frame_url), 'image', mimeType);
    addMedia(getString(record.lastFrameUrl), 'image', mimeType);
    addMedia(getString(record.image), 'image', mimeType);
    addMedia(getString(record.image_url), 'image', mimeType);
    addMedia(getString(record.imageUrl), 'image', mimeType);

    const genericUrl =
      getString(record.url) || getString(record.uri) || getString(record.src);
    addMedia(genericUrl, derivedType, mimeType);

    visit(record.video, 'video');
    visit(record.videos, 'video');
    visit(record.audio, 'audio');
    visit(record.audios, 'audio');
    visit(record.image, 'image');
    visit(record.images, 'image');
    visit(record.output, fallbackType);
    visit(record.data, fallbackType);
    visit(record.result, fallbackType);
    visit(record.payload, fallbackType);
    visit(record.content, fallbackType);
  };

  visit(result);

  return media;
}
