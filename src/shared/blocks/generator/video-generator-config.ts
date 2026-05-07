import type { VideoGeneratorMode } from './video-generator-mode';
import {
  SEEDANCE_DEFAULT_DURATION_SECONDS,
  SEEDANCE_DEFAULT_RESOLUTION,
  SEEDANCE_MAX_DURATION_SECONDS,
  SEEDANCE_MIN_DURATION_SECONDS,
} from '@/extensions/ai/seedance/types';

type SelectOption = {
  value: string;
  label: string;
};

export const MIN_VIDEO_DURATION_SECONDS = SEEDANCE_MIN_DURATION_SECONDS;
export const MAX_VIDEO_DURATION_SECONDS = SEEDANCE_MAX_DURATION_SECONDS;
export const DEFAULT_VIDEO_DURATION_SECONDS = String(
  SEEDANCE_DEFAULT_DURATION_SECONDS
);
export const DEFAULT_VIDEO_RESOLUTION = SEEDANCE_DEFAULT_RESOLUTION;
export const DEFAULT_VIDEO_ASPECT_RATIO = '16:9';

export const VIDEO_DURATION_OPTIONS: SelectOption[] = Array.from(
  { length: MAX_VIDEO_DURATION_SECONDS - MIN_VIDEO_DURATION_SECONDS + 1 },
  (_, index) => {
    const value = String(MIN_VIDEO_DURATION_SECONDS + index);
    return {
      value,
      label: `${value}s`,
    };
  }
);

export const VIDEO_RESOLUTION_OPTIONS: SelectOption[] = [
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p' },
];

export const VIDEO_ASPECT_RATIO_OPTIONS: SelectOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9' },
  { value: 'auto', label: 'Auto' },
];

const VIDEO_RESOLUTION_VALUES = new Set(
  VIDEO_RESOLUTION_OPTIONS.map((option) => option.value)
);
const VIDEO_ASPECT_RATIO_VALUES = new Set(
  VIDEO_ASPECT_RATIO_OPTIONS.map((option) => option.value)
);

function normalizeSelectValue(
  value: string | null | undefined,
  fallback: string,
  allowedValues: ReadonlySet<string>
) {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed || !allowedValues.has(trimmed)) {
    return fallback;
  }

  return trimmed;
}

export function normalizeVideoDurationSeconds(value?: string | null) {
  if (!value) {
    return DEFAULT_VIDEO_DURATION_SECONDS;
  }

  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) {
    return DEFAULT_VIDEO_DURATION_SECONDS;
  }

  const bounded = Math.min(
    MAX_VIDEO_DURATION_SECONDS,
    Math.max(MIN_VIDEO_DURATION_SECONDS, Math.round(parsed))
  );

  return String(bounded);
}

export function normalizeVideoResolution(value?: string | null) {
  return normalizeSelectValue(
    value,
    DEFAULT_VIDEO_RESOLUTION,
    VIDEO_RESOLUTION_VALUES
  );
}

export function normalizeVideoAspectRatio(value?: string | null) {
  return normalizeSelectValue(
    value,
    DEFAULT_VIDEO_ASPECT_RATIO,
    VIDEO_ASPECT_RATIO_VALUES
  );
}

type EstimateVideoGenerationInput = {
  mode: VideoGeneratorMode;
  durationSeconds: string;
  resolution: string;
  fast: boolean;
};

export function estimateVideoGenerationSeconds({
  mode,
  durationSeconds,
  resolution,
  fast,
}: EstimateVideoGenerationInput) {
  const selectedDuration = Number(
    normalizeVideoDurationSeconds(durationSeconds)
  );
  const normalizedResolution = normalizeVideoResolution(resolution);
  const base = normalizedResolution === '720p' ? 150 : 120;
  const modePenalty = mode === 'reference-to-video' ? 30 : mode === 'image-to-video' ? 20 : 0;
  const fastBonus = fast ? -30 : 0;

  return Math.max(45, base + modePenalty + selectedDuration * 8 + fastBonus);
}

type BuildVideoGenerationOptionsInput = {
  mode: VideoGeneratorMode;
  durationSeconds: string;
  resolution: string;
  aspectRatio: string;
  fast: boolean;
  generateAudio: boolean;
  webSearch: boolean;
  returnLastFrame?: boolean;
  numericSeed?: number;
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
};

export function buildVideoGenerationOptions({
  mode,
  durationSeconds,
  resolution,
  aspectRatio,
  fast,
  generateAudio,
  webSearch,
  returnLastFrame,
  numericSeed,
  imageUrls,
  videoUrls,
  audioUrls,
}: BuildVideoGenerationOptionsInput): Record<string, unknown> {
  const normalizedDuration = normalizeVideoDurationSeconds(durationSeconds);
  const normalizedResolution = normalizeVideoResolution(resolution);
  const normalizedAspectRatio = normalizeVideoAspectRatio(aspectRatio);

  const options: Record<string, unknown> = {
    fast,
    duration: Number(normalizedDuration),
    resolution: normalizedResolution,
    aspect_ratio: normalizedAspectRatio,
    generate_audio: generateAudio,
    web_search: webSearch,
  };

  if (numericSeed !== undefined) {
    options.seed = numericSeed;
  }

  if (returnLastFrame) {
    options.return_last_frame = true;
  }

  if (mode === 'image-to-video' && imageUrls?.length) {
    options.image_urls = imageUrls;
  }

  if (mode === 'reference-to-video') {
    if (imageUrls?.length) {
      options.image_urls = imageUrls;
    }
    if (videoUrls?.length) {
      options.video_urls = videoUrls;
    }
    if (audioUrls?.length) {
      options.audio_urls = audioUrls;
    }
  }

  return options;
}
