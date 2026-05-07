import { stripProviderBranding } from '@/shared/lib/provider-error-copy';

import type { VideoGeneratorMode } from './video-generator-mode';

type VideoGeneratorErrorKey =
  | 'error_nsfw_blocked'
  | 'error_input_validation'
  | 'error_image_url_access'
  | 'error_invalid_request'
  | 'error_provider_unavailable'
  | 'error_rate_limited'
  | 'error_reference_unsupported'
  | 'error_request_failed'
  | 'error_request_processing'
  | 'error_unknown'
  | 'insufficient_credits'
  | 'prompt_required';

export type VideoGeneratorErrorDescriptor =
  | {
      kind: 'translation';
      key: VideoGeneratorErrorKey;
    }
  | {
      kind: 'generic';
      reason: string;
    }
  | {
      kind: 'raw';
      message: string;
    };

type ResolveVideoGeneratorErrorInput = {
  raw?: string;
  errorCode?: string | null;
  mode: VideoGeneratorMode;
  imageUrl: string;
};

const API_ERROR_TRANSLATION_KEYS: Record<string, VideoGeneratorErrorKey> = {
  ai_generate_insufficient_credits: 'insufficient_credits',
  ai_generate_invalid_payload: 'error_invalid_request',
  ai_generate_prompt_required: 'prompt_required',
  ai_generate_provider_unavailable: 'error_provider_unavailable',
  ai_generate_reference_unsupported: 'error_reference_unsupported',
  ai_generate_request_failed: 'error_request_failed',
  ai_generate_request_processing: 'error_request_processing',
};

const DIRECT_VALIDATION_PREFIXES = [
  'aspect_ratio',
  'resolution',
  'output_format',
  'image_url',
  'prompt ',
] as const;

const SAFETY_KEYWORDS = [
  'nsfw',
  'safety',
  'inappropriate',
  'content checker',
  'sensitive content',
  'sensitive information',
  'outputvideosensitivecontentdetected',
] as const;

const IMAGE_LOAD_FAILURE_KEYWORDS = [
  'failed to load the image',
  'failed to load image',
  'failed to load the input',
  'image could not be loaded',
  'could not load image',
  'failed to fetch',
  'could not fetch',
  'failed to download',
  'unable to download',
  'image file is not corrupted',
  'supported format',
  'unsupported format',
];

const IMAGE_ACCESS_KEYWORDS = [
  'forbidden',
  'unauthorized',
  'permission',
  'access denied',
  'not authorized',
  'not found',
];

const UNPROCESSABLE_KEYWORDS = [
  'content could not be processed',
  'unprocessable entity',
  'status: 422',
  'status code: 422',
];

const IMAGE_SIGNAL_KEYWORDS = [
  'image_url',
  'image url',
  'image',
  'download',
  'fetch',
  'drive',
  'dropbox',
  'onedrive',
  'url',
];

const PROVIDER_PERMISSION_KEYWORDS = [
  'upstream provider',
  'provider rejected',
  'temporarily unavailable',
  'api key',
  'token',
  'account permission',
] as const;

function includesAny(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function getVideoGeneratorErrorDescriptor({
  raw,
  errorCode,
  mode,
  imageUrl,
}: ResolveVideoGeneratorErrorInput): VideoGeneratorErrorDescriptor {
  const normalizedRaw = stripProviderBranding(raw);
  const lower = normalizedRaw?.toLowerCase() ?? '';
  const isImageUrlMode =
    mode === 'image-to-video' || mode === 'reference-to-video';
  const apiErrorKey = errorCode ? API_ERROR_TRANSLATION_KEYS[errorCode] : null;
  const hasSafetyFlag = includesAny(lower, SAFETY_KEYWORDS);
  const hasLoadImageFailure = includesAny(lower, IMAGE_LOAD_FAILURE_KEYWORDS);
  const hasAccessFlag =
    includesAny(lower, IMAGE_ACCESS_KEYWORDS) ||
    /\b(401|403|404)\b/.test(lower);
  const hasUnprocessable =
    includesAny(lower, UNPROCESSABLE_KEYWORDS) || /\b422\b/.test(lower);
  const hasImageSignal = includesAny(lower, IMAGE_SIGNAL_KEYWORDS);
  const hasProviderPermissionSignal = includesAny(
    lower,
    PROVIDER_PERMISSION_KEYWORDS
  );
  const looksLikeImageAccessIssue =
    isImageUrlMode &&
    !hasProviderPermissionSignal &&
    (hasLoadImageFailure ||
      hasAccessFlag ||
      (hasUnprocessable &&
        !hasSafetyFlag &&
        (hasImageSignal || imageUrl.trim().length > 0)));

  if (apiErrorKey) {
    return { kind: 'translation', key: apiErrorKey };
  }

  if (lower === 'prompt is required') {
    return { kind: 'translation', key: 'prompt_required' };
  }

  if (lower === 'insufficient credits') {
    return { kind: 'translation', key: 'insufficient_credits' };
  }

  if (
    lower === 'invalid generate payload' ||
    lower === 'model is not allowed for this route' ||
    lower === 'invalid scene' ||
    lower === 'invalid mediatype' ||
    lower.startsWith(
      'idempotency key conflicts with a different generate payload'
    )
  ) {
    return { kind: 'translation', key: 'error_invalid_request' };
  }

  if (lower === 'too many generate attempts, please slow down') {
    return { kind: 'translation', key: 'error_rate_limited' };
  }

  if (lower === 'same generate request is already processing') {
    return { kind: 'translation', key: 'error_request_processing' };
  }

  if (lower === 'generation could not be completed. please try again.') {
    return { kind: 'translation', key: 'error_request_failed' };
  }

  if (
    lower ===
      'this ai route is temporarily unavailable because an upstream provider is not configured.' ||
    lower ===
      'this ai route is temporarily unavailable because an upstream provider rejected the request with a permission error.'
  ) {
    return { kind: 'translation', key: 'error_provider_unavailable' };
  }

  if (hasSafetyFlag) {
    return { kind: 'translation', key: 'error_nsfw_blocked' };
  }

  if (
    normalizedRaw &&
    DIRECT_VALIDATION_PREFIXES.some((prefix) => lower.startsWith(prefix))
  ) {
    return { kind: 'raw', message: normalizedRaw };
  }

  if (!looksLikeImageAccessIssue && hasUnprocessable) {
    return { kind: 'translation', key: 'error_input_validation' };
  }

  if (lower.includes('real person') || lower.includes('real-person')) {
    return { kind: 'translation', key: 'error_reference_unsupported' };
  }

  if (looksLikeImageAccessIssue) {
    return { kind: 'translation', key: 'error_image_url_access' };
  }

  if (normalizedRaw) {
    return { kind: 'generic', reason: normalizedRaw };
  }

  return { kind: 'translation', key: 'error_unknown' };
}
