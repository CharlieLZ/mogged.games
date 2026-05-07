import {
  getReferenceMediaUrlErrorMessage,
  getReferenceMediaUrlExtension,
  getReferenceMediaUrlIssue,
  isStorageBackedReferenceMediaUrl,
  sniffStorageBackedReferenceMediaContentType,
  type ReferenceMediaKind,
} from '@/shared/lib/reference-media-url';

import {
  SEEDANCE_ASPECT_RATIOS,
  SEEDANCE_DEFAULT_DURATION_SECONDS,
  SEEDANCE_DEFAULT_EXECUTION_EXPIRES_AFTER_SECONDS,
  SEEDANCE_DEFAULT_FAST,
  SEEDANCE_DEFAULT_RESOLUTION,
  SEEDANCE_MAX_EXECUTION_EXPIRES_AFTER_SECONDS,
  SEEDANCE_MAX_DURATION_SECONDS,
  SEEDANCE_MIN_EXECUTION_EXPIRES_AFTER_SECONDS,
  SEEDANCE_MIN_DURATION_SECONDS,
  SEEDANCE_RESOLUTIONS,
  SeedanceAspectRatio,
  SeedanceRequest,
  SeedanceResolution,
  SeedanceScene,
} from './types';
import { SeedanceValidationError } from './errors';

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return fallback;
}

function toFiniteNumber(value: unknown) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : undefined;
}

function toArrayOfStrings(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toTrimmedString(item))
    .filter((item): item is string => typeof item === 'string');
}

function normalizeAspectRatio(value: unknown): SeedanceAspectRatio {
  const normalized = toTrimmedString(value)?.toLowerCase();
  if (!normalized) {
    return '16:9';
  }

  if (normalized === 'adaptive') {
    return 'auto';
  }

  if (SEEDANCE_ASPECT_RATIOS.includes(normalized as SeedanceAspectRatio)) {
    return normalized as SeedanceAspectRatio;
  }

  return '16:9';
}

function normalizeResolution(value: unknown): SeedanceResolution {
  const normalized = toTrimmedString(value)?.toLowerCase();
  if (
    normalized &&
    SEEDANCE_RESOLUTIONS.includes(normalized as SeedanceResolution)
  ) {
    return normalized as SeedanceResolution;
  }

  return SEEDANCE_DEFAULT_RESOLUTION;
}

function normalizeDuration(value: unknown) {
  const parsed = toFiniteNumber(value);
  if (parsed === undefined) {
    return SEEDANCE_DEFAULT_DURATION_SECONDS;
  }

  return Math.min(
    SEEDANCE_MAX_DURATION_SECONDS,
    Math.max(SEEDANCE_MIN_DURATION_SECONDS, Math.round(parsed))
  );
}

function normalizeExecutionExpiresAfter(value: unknown) {
  const parsed = toFiniteNumber(value);
  if (parsed === undefined) {
    return SEEDANCE_DEFAULT_EXECUTION_EXPIRES_AFTER_SECONDS;
  }

  const normalized = Math.floor(parsed);
  if (
    normalized < SEEDANCE_MIN_EXECUTION_EXPIRES_AFTER_SECONDS ||
    normalized > SEEDANCE_MAX_EXECUTION_EXPIRES_AFTER_SECONDS
  ) {
    throw new SeedanceValidationError(
      `execution_expires_after must be between ${SEEDANCE_MIN_EXECUTION_EXPIRES_AFTER_SECONDS} and ${SEEDANCE_MAX_EXECUTION_EXPIRES_AFTER_SECONDS} seconds.`
    );
  }

  return normalized;
}

function normalizeSeed(value: unknown) {
  const parsed = toFiniteNumber(value);
  if (parsed === undefined) {
    return undefined;
  }

  if (parsed < 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

function normalizeSafetyIdentifier(value: unknown) {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return undefined;
  }

  if (normalized.length > 64) {
    throw new SeedanceValidationError(
      'safety_identifier must not exceed 64 characters.'
    );
  }

  return normalized;
}

function assertReferenceUrlsArePublic(
  urls: string[],
  kind: ReferenceMediaKind
) {
  for (const url of urls) {
    const issue = getReferenceMediaUrlIssue(url, kind);
    if (issue) {
      throw new SeedanceValidationError(
        getReferenceMediaUrlErrorMessage(issue, kind)
      );
    }
  }
}

const SUPPORTED_STORAGE_REFERENCE_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
]);

const REFERENCE_MODE_FRAME_INPUT_ERROR =
  'reference mode does not accept first_frame_url/start_image_url/last_frame_url inputs. Use image_urls, video_urls, and audio_urls instead.';

function hasReferenceFrameInputs(options: Record<string, unknown>) {
  return Boolean(
    toTrimmedString(options.first_frame_url ?? options.firstFrameUrl) ||
      toTrimmedString(options.start_image_url ?? options.startImageUrl) ||
      toTrimmedString(options.last_frame_url ?? options.lastFrameUrl)
  );
}

function collectImageUrls(options: Record<string, unknown>) {
  const explicit = toArrayOfStrings(options.image_urls ?? options.imageUrls);
  const firstFrame = toTrimmedString(
    options.first_frame_url ??
      options.firstFrameUrl ??
      options.start_image_url ??
      options.startImageUrl ??
      options.image_url ??
      options.imageUrl ??
      options.image
  );
  const lastFrame = toTrimmedString(options.last_frame_url ?? options.lastFrameUrl);

  if (explicit.length > 0) {
    return explicit;
  }

  const combined = [firstFrame, lastFrame].filter(
    (value): value is string => typeof value === 'string'
  );
  return combined;
}

export function normalizeSeedanceRequest(input: {
  scene: SeedanceScene;
  prompt: string;
  options?: Record<string, unknown>;
}): SeedanceRequest {
  const options = input.options || {};
  const prompt = input.prompt.trim();

  if (input.scene === 'text-to-video' && !prompt) {
    throw new SeedanceValidationError('prompt is required');
  }

  const imageUrls = collectImageUrls(options);
  const videoUrls = toArrayOfStrings(options.video_urls ?? options.videoUrls);
  const audioUrls = toArrayOfStrings(options.audio_urls ?? options.audioUrls);

  const request: SeedanceRequest = {
    scene: input.scene,
    fast: toBoolean(options.fast, SEEDANCE_DEFAULT_FAST),
    prompt,
    duration: normalizeDuration(options.duration),
    executionExpiresAfter: normalizeExecutionExpiresAfter(
      options.execution_expires_after ?? options.executionExpiresAfter
    ),
    resolution: normalizeResolution(options.resolution ?? options.quality),
    aspectRatio: normalizeAspectRatio(
      options.aspect_ratio ?? options.aspectRatio
    ),
    generateAudio: toBoolean(
      options.generate_audio ?? options.sound,
      true
    ),
    webSearch: toBoolean(options.web_search ?? options.webSearch, false),
    seed: normalizeSeed(options.seed),
    safetyIdentifier: normalizeSafetyIdentifier(
      options.safety_identifier ?? options.safetyIdentifier
    ),
    watermark: toBoolean(options.watermark, false),
    imageUrls,
    videoUrls,
    audioUrls,
    returnLastFrame: toBoolean(
      options.return_last_frame ?? options.returnLastFrame,
      false
    ),
  };

  assertReferenceUrlsArePublic(request.imageUrls, 'image');
  assertReferenceUrlsArePublic(request.videoUrls, 'video');
  assertReferenceUrlsArePublic(request.audioUrls, 'audio');

  if (input.scene === 'text-to-video') {
    if (
      request.imageUrls.length > 0 ||
      request.videoUrls.length > 0 ||
      request.audioUrls.length > 0
    ) {
      throw new SeedanceValidationError(
        'text mode does not accept image, video, or audio references.'
      );
    }
  }

  if (input.scene === 'image-to-video') {
    if (request.imageUrls.length === 0) {
      throw new SeedanceValidationError(
        'image mode requires at least one image reference.'
      );
    }

    if (request.imageUrls.length > 2) {
      throw new SeedanceValidationError(
        'image mode supports at most two images (first and optional last frame).'
      );
    }

    if (request.videoUrls.length > 0 || request.audioUrls.length > 0) {
      throw new SeedanceValidationError(
        'image mode does not accept reference videos or reference audios.'
      );
    }
  }

  if (input.scene === 'reference-to-video') {
    if (hasReferenceFrameInputs(options)) {
      throw new SeedanceValidationError(REFERENCE_MODE_FRAME_INPUT_ERROR);
    }

    if (request.imageUrls.length === 0 && request.videoUrls.length === 0) {
      throw new SeedanceValidationError(
        'reference mode requires at least one reference image or reference video.'
      );
    }

    if (
      request.audioUrls.length > 0 &&
      request.imageUrls.length === 0 &&
      request.videoUrls.length === 0
    ) {
      throw new SeedanceValidationError(
        'reference mode does not support audio-only requests.'
      );
    }
  }

  if (request.imageUrls.length > 9) {
    throw new SeedanceValidationError('at most 9 reference images are allowed.');
  }

  if (request.videoUrls.length > 3) {
    throw new SeedanceValidationError('at most 3 reference videos are allowed.');
  }

  if (request.audioUrls.length > 3) {
    throw new SeedanceValidationError('at most 3 reference audios are allowed.');
  }

  return request;
}

export async function assertStorageBackedSeedanceVideoFormats(
  request: SeedanceRequest,
  fetchImpl: typeof fetch = fetch
) {
  if (request.scene !== 'reference-to-video' || request.videoUrls.length === 0) {
    return;
  }

  for (const url of request.videoUrls) {
    if (
      !isStorageBackedReferenceMediaUrl(url) ||
      getReferenceMediaUrlExtension(url)
    ) {
      continue;
    }

    const contentType = await sniffStorageBackedReferenceMediaContentType(
      url,
      fetchImpl
    );

    if (
      contentType &&
      !SUPPORTED_STORAGE_REFERENCE_VIDEO_MIME_TYPES.has(contentType)
    ) {
      throw new SeedanceValidationError(
        'storage-backed reference videos must resolve to MP4/MOV/M4V before they can be sent to the current providers.'
      );
    }
  }
}
