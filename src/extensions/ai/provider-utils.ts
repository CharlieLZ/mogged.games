import 'server-only';

import { nanoid } from 'nanoid';

import { envConfigs } from '@/config';
import {
  getReferenceImageUrlErrorMessage,
  getReferenceImageUrlIssue,
} from '@/shared/lib/reference-image-url';

import { AIImage, AIVideo } from './types';

const IMAGE_SIZE_TO_ASPECT_RATIO: Record<string, string> = {
  square: '1:1',
  square_hd: '1:1',
  portrait_4_3: '3:4',
  portrait_16_9: '9:16',
  landscape_4_3: '4:3',
  landscape_16_9: '16:9',
  '1024x1024': '1:1',
  '768x1024': '3:4',
  '720x1280': '9:16',
  '1024x768': '4:3',
  '1280x720': '16:9',
};

const SEEDREAM_SIZE_BY_ASPECT_RATIO: Record<string, string> = {
  '1:1': '2048x2048',
  '4:3': '2688x2016',
  '3:4': '2016x2688',
  '16:9': '2560x1440',
  '9:16': '1440x2560',
  '3:2': '2688x1792',
  '2:3': '1792x2688',
  '5:4': '2560x2048',
  '4:5': '2048x2560',
  '21:9': '3360x1440',
  adaptive: '2560x1440',
};

const ASPECT_RATIO_ALIASES: Record<string, string> = {
  landscape: '16:9',
  portrait: '9:16',
  square: '1:1',
  auto: 'adaptive',
  automatic: 'adaptive',
};

const STUDIO_IMAGE_ASPECT_RATIOS = new Set([
  '1:1',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '3:2',
  '2:3',
  '5:4',
  '4:5',
  '21:9',
]);

const STUDIO_VIDEO_ASPECT_RATIOS = new Set([
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '1:1',
  '21:9',
  'adaptive',
]);

const STUDIO_VIDEO_RESOLUTIONS = new Set(['480p', '720p', '1080p']);
const KIE_VEO_ASPECT_RATIOS = new Set(['16:9', '9:16', 'Auto']);
const WAVESPEED_VEO_ASPECT_RATIOS = new Set(['16:9', '9:16']);
const KIE_MARKET_OUTPUT_FORMATS = new Set(['png', 'jpg']);
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.gif'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp'];

export class AIInputValidationError extends Error {
  readonly code = 'PARAM_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'AIInputValidationError';
  }
}

function normalizeSizeValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/\*/g, 'x').replace(/X/g, 'x');
}

export function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function toFiniteNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getImageArray(input: Record<string, unknown>): string[] {
  const fromImageInput = Array.isArray(input.image_input)
    ? input.image_input.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0
      )
    : [];
  if (fromImageInput.length > 0) {
    return fromImageInput;
  }

  const fromImageUrls = Array.isArray(input.image_urls)
    ? input.image_urls.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0
      )
    : [];
  if (fromImageUrls.length > 0) {
    return fromImageUrls;
  }

  const fromImageUrlsCamel = Array.isArray(input.imageUrls)
    ? input.imageUrls.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0
      )
    : [];
  if (fromImageUrlsCamel.length > 0) {
    return fromImageUrlsCamel;
  }

  const single =
    toTrimmedString(input.image) ??
    toTrimmedString(input.image_url) ??
    toTrimmedString(input.imageUrl) ??
    toTrimmedString(input.start_image_url);

  return single ? [single] : [];
}

export function getFirstImageUrl(input: Record<string, unknown>) {
  return getImageArray(input)[0];
}

export function normalizeAspectRatio(value: unknown): string | undefined {
  const raw = toTrimmedString(value);
  if (!raw) {
    return undefined;
  }

  const lowered = raw.toLowerCase();

  return (
    IMAGE_SIZE_TO_ASPECT_RATIO[raw] ?? ASPECT_RATIO_ALIASES[lowered] ?? raw
  );
}

export function resolveSeedreamSize(input: Record<string, unknown>) {
  const explicitSize =
    normalizeSizeValue(input.size) ??
    normalizeSizeValue(input.image_size) ??
    normalizeSizeValue(input.imageSize);
  if (explicitSize) {
    return explicitSize;
  }

  const aspectRatio =
    normalizeAspectRatio(input.aspect_ratio) ??
    normalizeAspectRatio(input.aspectRatio) ??
    normalizeAspectRatio(input.image_size) ??
    normalizeAspectRatio(input.imageSize);
  if (!aspectRatio) {
    return undefined;
  }

  return SEEDREAM_SIZE_BY_ASPECT_RATIO[aspectRatio];
}

export function resolveVideoAspectRatio(input: Record<string, unknown>) {
  return (
    normalizeAspectRatio(input.aspect_ratio) ??
    normalizeAspectRatio(input.aspectRatio) ??
    '16:9'
  );
}

export function resolveVideoResolution(input: Record<string, unknown>) {
  const resolution = toTrimmedString(input.resolution)?.toLowerCase();
  if (
    resolution === '480p' ||
    resolution === '720p' ||
    resolution === '1080p'
  ) {
    return resolution;
  }

  return '720p';
}

export function resolveStudioVideoDuration(input: Record<string, unknown>) {
  const duration = resolveVideoDuration(input);
  return Math.min(12, Math.max(4, duration));
}

export function resolveVideoDuration(input: Record<string, unknown>) {
  const explicitDuration = toFiniteNumber(input.duration);
  if (explicitDuration !== undefined) {
    return Math.min(12, Math.max(2, Math.round(explicitDuration)));
  }

  const numFrames =
    toFiniteNumber(input.num_frames) ?? toFiniteNumber(input.frames);
  const fps = toFiniteNumber(input.fps) ?? 24;
  if (numFrames !== undefined && fps > 0) {
    const derivedSeconds = Math.round(numFrames / fps);
    return Math.min(12, Math.max(2, derivedSeconds));
  }

  return 5;
}

function assertAllowedValue(
  value: string,
  allowed: Set<string>,
  field: string
): string {
  if (!allowed.has(value)) {
    throw new AIInputValidationError(
      `${field} must be one of: ${[...allowed].join(', ')}`
    );
  }

  return value;
}

function normalizeOutputFormat(value: unknown) {
  const raw = toTrimmedString(value)?.toLowerCase();
  if (!raw) {
    return undefined;
  }

  if (raw === 'jpeg' || raw === 'jpg') {
    return 'jpg';
  }

  if (raw === 'webp') {
    return 'png';
  }

  if (raw === 'png') {
    return 'png';
  }

  throw new AIInputValidationError(
    'output_format must be png or jpeg for the current studio image routes.'
  );
}

export function sanitizeStudioGenerateOptions(params: {
  scene:
    | 'text-to-image'
    | 'image-to-image'
    | 'text-to-video'
    | 'image-to-video';
  options?: Record<string, unknown>;
}) {
  const source = params.options || {};
  const normalized: Record<string, unknown> = {};

  const imageUrl = getFirstImageUrl(source);
  const aspectRatio =
    normalizeAspectRatio(source.aspect_ratio) ??
    normalizeAspectRatio(source.aspectRatio) ??
    normalizeAspectRatio(source.image_size) ??
    normalizeAspectRatio(source.imageSize);

  if (params.scene === 'image-to-image' || params.scene === 'image-to-video') {
    if (!imageUrl) {
      throw new AIInputValidationError(
        'image_url is required for image-to-image and image-to-video requests.'
      );
    }
  }

  if (imageUrl) {
    const issue = getReferenceImageUrlIssue(imageUrl);
    if (issue) {
      throw new AIInputValidationError(getReferenceImageUrlErrorMessage(issue));
    }
    normalized.image_url = imageUrl;
  }

  const seed = toFiniteNumber(source.seed);
  if (seed !== undefined) {
    normalized.seed = Math.max(0, Math.floor(seed));
  }

  if (params.scene === 'text-to-image' || params.scene === 'image-to-image') {
    if (aspectRatio) {
      normalized.aspect_ratio = assertAllowedValue(
        aspectRatio,
        STUDIO_IMAGE_ASPECT_RATIOS,
        'aspect_ratio'
      );
    }

    const outputFormat = normalizeOutputFormat(
      source.output_format ?? source.outputFormat
    );
    if (outputFormat) {
      normalized.output_format = outputFormat;
    }

    const guidanceScale = toFiniteNumber(
      source.guidance_scale ?? source.guidanceScale
    );
    if (guidanceScale !== undefined) {
      normalized.guidance_scale = Math.min(20, Math.max(1, guidanceScale));
    }

    const numImages = toFiniteNumber(source.num_images ?? source.numImages);
    if (numImages !== undefined) {
      normalized.num_images = Math.min(15, Math.max(1, Math.floor(numImages)));
    }

    return normalized;
  }

  if (aspectRatio) {
    normalized.aspect_ratio = assertAllowedValue(
      aspectRatio,
      STUDIO_VIDEO_ASPECT_RATIOS,
      'aspect_ratio'
    );
  } else {
    normalized.aspect_ratio = '16:9';
  }

  const resolution = toTrimmedString(source.resolution)?.toLowerCase();
  if (resolution) {
    normalized.resolution = assertAllowedValue(
      resolution,
      STUDIO_VIDEO_RESOLUTIONS,
      'resolution'
    );
  } else {
    normalized.resolution = '720p';
  }

  normalized.duration = resolveStudioVideoDuration(source);

  const negativePrompt = toTrimmedString(
    source.negative_prompt ?? source.negativePrompt
  );
  if (negativePrompt) {
    normalized.negative_prompt = negativePrompt;
  }

  return normalized;
}

export function resolveKieMarketAspectRatio(input: Record<string, unknown>) {
  const ratio =
    normalizeAspectRatio(input.aspect_ratio) ??
    normalizeAspectRatio(input.aspectRatio) ??
    normalizeAspectRatio(input.image_size) ??
    normalizeAspectRatio(input.imageSize);

  if (!ratio) {
    return undefined;
  }

  return STUDIO_IMAGE_ASPECT_RATIOS.has(ratio) ? ratio : '1:1';
}

export function resolveKieMarketOutputFormat(input: Record<string, unknown>) {
  const format = normalizeOutputFormat(
    input.output_format ?? input.outputFormat
  );
  if (!format) {
    return undefined;
  }

  return assertAllowedValue(format, KIE_MARKET_OUTPUT_FORMATS, 'output_format');
}

export function resolveKieNanoBananaProResolution(
  input: Record<string, unknown>
) {
  const raw = toTrimmedString(input.resolution)?.toUpperCase();
  if (!raw) {
    return '1K';
  }

  if (raw === '1K' || raw === '2K' || raw === '4K') {
    return raw;
  }

  return '1K';
}

export function resolveKieVeoAspectRatio(input: Record<string, unknown>) {
  const ratio =
    normalizeAspectRatio(input.aspect_ratio) ??
    normalizeAspectRatio(input.aspectRatio);

  if (!ratio || ratio === 'adaptive') {
    return 'Auto';
  }

  if (KIE_VEO_ASPECT_RATIOS.has(ratio)) {
    return ratio;
  }

  return '16:9';
}

export function resolveKieVeoSeed(input: Record<string, unknown>) {
  const seed = toFiniteNumber(input.seed);
  if (seed === undefined) {
    return undefined;
  }

  return 10000 + (Math.abs(Math.floor(seed)) % 90000);
}

export function resolveKieVeoGenerationType(input: Record<string, unknown>) {
  return getImageArray(input).length > 0
    ? 'FIRST_AND_LAST_FRAMES_2_VIDEO'
    : 'TEXT_2_VIDEO';
}

export function resolveWavespeedVeoAspectRatio(input: Record<string, unknown>) {
  const ratio =
    normalizeAspectRatio(input.aspect_ratio) ??
    normalizeAspectRatio(input.aspectRatio);

  if (ratio && WAVESPEED_VEO_ASPECT_RATIOS.has(ratio)) {
    return ratio;
  }

  return '16:9';
}

export function resolveWavespeedVeoResolution(input: Record<string, unknown>) {
  const resolution = toTrimmedString(input.resolution)?.toLowerCase();
  if (resolution === '1080p') {
    return '1080p';
  }

  return '720p';
}

export function resolveWavespeedVeoDuration(input: Record<string, unknown>) {
  const duration = resolveStudioVideoDuration(input);
  const supportedDurations = [4, 6, 8];

  return supportedDurations.reduce((best, current) =>
    Math.abs(current - duration) <= Math.abs(best - duration) ? current : best
  );
}

export function detectMediaTypeFromUrl(
  url: string | undefined
): 'image' | 'video' {
  if (!url) {
    return 'image';
  }

  const lower = url.toLowerCase();
  if (VIDEO_EXTENSIONS.some((extension) => lower.includes(extension))) {
    return 'video';
  }

  return 'image';
}

function isLikelyUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function collectUrls(value: unknown, depth: number, results: Set<string>) {
  if (depth > 6 || value === null || value === undefined) {
    return;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && isLikelyUrl(trimmed)) {
      results.add(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, depth + 1, results));
    return;
  }

  if (typeof value !== 'object') {
    return;
  }

  const record = value as Record<string, unknown>;
  const directKeys = [
    'url',
    'imageUrl',
    'image_url',
    'videoUrl',
    'video_url',
    'fileUrl',
    'file_url',
    'last_frame_url',
    'lastFrameUrl',
    'thumbnail',
    'thumbnail_url',
  ];

  directKeys.forEach((key) => {
    collectUrls(record[key], depth + 1, results);
  });

  Object.values(record).forEach((child) => {
    collectUrls(child, depth + 1, results);
  });
}

export function extractResultUrls(payload: unknown) {
  const results = new Set<string>();
  collectUrls(payload, 0, results);
  return [...results];
}

export async function maybeRehostMediaUrl(
  url: string | undefined,
  type: 'image' | 'video',
  providerName: string
): Promise<string | undefined> {
  if (!url) {
    return url;
  }

  const lowered = url.toLowerCase();
  if (
    (envConfigs.r2_domain &&
      lowered.startsWith(envConfigs.r2_domain.toLowerCase())) ||
    (envConfigs.r2_endpoint &&
      lowered.startsWith(envConfigs.r2_endpoint.toLowerCase())) ||
    (envConfigs.r2_bucket_name &&
      lowered.includes(`/${envConfigs.r2_bucket_name.toLowerCase()}/`))
  ) {
    return url;
  }

  try {
    const { getStorageService } = await import('@/shared/services/storage');
    const storageService = await getStorageService();
    const pathname = (() => {
      try {
        return new URL(url).pathname;
      } catch {
        return url.split('?')[0];
      }
    })();
    const extMatch = pathname.match(/\.([a-zA-Z0-9]+)$/);
    const ext =
      extMatch?.[1] ||
      (type === 'video'
        ? 'mp4'
        : IMAGE_EXTENSIONS.find((extension) =>
            pathname.endsWith(extension)
          )?.slice(1) || 'png');
    const key = `ai/${providerName}/${type}s/${Date.now()}-${nanoid()}.${ext}`;
    const upload = await storageService.downloadAndUpload({
      url,
      key,
    });

    if (upload.success && upload.url) {
      return upload.url;
    }

    console.error(
      `[${providerName}] rehost ${type} failed`,
      upload.error || upload
    );
    return url;
  } catch (error) {
    console.error(`[${providerName}] rehost ${type} failed`, error);
    return url;
  }
}

export async function createImageItemsFromUrls(params: {
  providerName: string;
  taskId: string;
  urls: string[];
}) {
  const { providerName, taskId, urls } = params;

  const images = await Promise.all(
    urls.map(
      async (url, index): Promise<AIImage> => ({
        id: `${taskId}-${index}`,
        createTime: new Date(),
        imageUrl: await maybeRehostMediaUrl(url, 'image', providerName),
      })
    )
  );

  return images.filter(
    (item): item is AIImage =>
      typeof item.imageUrl === 'string' && item.imageUrl.length > 0
  );
}

export async function createVideoItemsFromUrls(params: {
  providerName: string;
  taskId: string;
  urls: string[];
}) {
  const { providerName, taskId, urls } = params;

  const videos = await Promise.all(
    urls.map(
      async (url, index): Promise<AIVideo> => ({
        id: `${taskId}-${index}`,
        createTime: new Date(),
        videoUrl: await maybeRehostMediaUrl(url, 'video', providerName),
      })
    )
  );

  return videos.filter(
    (item): item is AIVideo =>
      typeof item.videoUrl === 'string' && item.videoUrl.length > 0
  );
}
