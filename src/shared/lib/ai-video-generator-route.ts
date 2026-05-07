import { getLocalizedPath } from '@/core/i18n/localized-path';
import {
  AI_VIDEO_GENERATOR_ROOT_PATH,
} from '@/config/website/public-page-metadata';
import {
  isVideoGeneratorMode,
  type VideoGeneratorMode,
} from '@/shared/blocks/generator/video-generator-mode';

export type AiGeneratorSearchParams = Record<
  string,
  string | string[] | undefined
> & {
  mode?: string | string[];
};

export const IMAGE_TO_VIDEO_SOURCE_IMAGE_QUERY_PARAM = 'imageUrl';

function getFirstSearchParamValue(value: string | string[] | null | undefined) {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' ? first.trim() : '';
}

export function buildImageToVideoGeneratorHref({
  imageUrl,
  locale,
}: {
  imageUrl: string;
  locale: string;
}) {
  const normalizedImageUrl = imageUrl.trim();
  return getAiVideoGeneratorModeStateHref({
    locale,
    mode: 'image-to-video',
    searchParams: normalizedImageUrl
      ? {
          [IMAGE_TO_VIDEO_SOURCE_IMAGE_QUERY_PARAM]: normalizedImageUrl,
        }
      : {},
  });
}

export function getRawGeneratorModeParam(
  searchParams: AiGeneratorSearchParams
): string | null {
  return getFirstSearchParamValue(searchParams.mode) || null;
}

export function getExplicitGeneratorMode(
  searchParams: AiGeneratorSearchParams
): VideoGeneratorMode | null {
  const rawMode = getRawGeneratorModeParam(searchParams);
  return rawMode && isVideoGeneratorMode(rawMode) ? rawMode : null;
}

function buildSearchSuffix(
  searchParams: AiGeneratorSearchParams,
  omitKeys: string[]
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (omitKeys.includes(key) || value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) {
          params.append(key, entry);
        }
      }
      continue;
    }

    if (value) {
      params.set(key, value);
    }
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export function getAiVideoGeneratorModeStateHref({
  locale,
  mode,
  searchParams = {},
}: {
  locale: string;
  mode: VideoGeneratorMode;
  searchParams?: AiGeneratorSearchParams;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'mode' || value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) {
          params.append(key, entry);
        }
      }
      continue;
    }

    if (value) {
      params.set(key, value);
    }
  }

  params.set('mode', mode);

  const serialized = params.toString();
  const localizedPath = getLocalizedPath(AI_VIDEO_GENERATOR_ROOT_PATH, locale);
  return serialized ? `${localizedPath}?${serialized}` : localizedPath;
}

export function getAiGeneratorModeRedirectHref({
  locale,
  searchParams,
}: {
  locale: string;
  searchParams: AiGeneratorSearchParams;
}) {
  const rawMode = getRawGeneratorModeParam(searchParams);
  if (!rawMode) {
    return null;
  }

  if (isVideoGeneratorMode(rawMode)) {
    return null;
  }

  return `${getLocalizedPath(AI_VIDEO_GENERATOR_ROOT_PATH, locale)}${buildSearchSuffix(searchParams, ['mode'])}`;
}
