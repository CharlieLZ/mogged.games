import { stripProviderBranding } from '@/shared/lib/provider-error-copy';

import type { ImageGeneratorMode } from './image-generator-mode';

type ImageGeneratorErrorKey =
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
  | 'form.image_url_cloud_drive'
  | 'form.image_url_invalid'
  | 'form.image_url_private'
  | 'form.image_url_video'
  | 'form.source_image_required'
  | 'guest_generation_unavailable'
  | 'guest_quota_exhausted'
  | 'guest_web_search_unavailable'
  | 'insufficient_credits'
  | 'prompt_required';

export type ImageGeneratorErrorDescriptor =
  | {
      kind: 'translation';
      key: ImageGeneratorErrorKey;
    }
  | {
      kind: 'generic';
      reason: string;
    }
  | {
      kind: 'raw';
      message: string;
    };

type ResolveImageGeneratorErrorInput = {
  raw?: string;
  errorCode?: string | null;
  mode: ImageGeneratorMode;
  imageUrl: string;
};

const API_ERROR_TRANSLATION_KEYS: Record<string, ImageGeneratorErrorKey> = {
  ai_generate_insufficient_credits: 'insufficient_credits',
  ai_generate_invalid_payload: 'error_invalid_request',
  ai_generate_prompt_required: 'prompt_required',
  ai_generate_provider_unavailable: 'error_provider_unavailable',
  ai_generate_reference_unsupported: 'error_reference_unsupported',
  ai_generate_request_failed: 'error_request_failed',
  ai_generate_request_processing: 'error_request_processing',
  guest_image_generation_unavailable: 'guest_generation_unavailable',
  guest_image_invalid_payload: 'error_input_validation',
  guest_image_prompt_required: 'prompt_required',
  guest_image_quota_exceeded: 'guest_quota_exhausted',
  guest_image_source_image_cloud_drive: 'form.image_url_cloud_drive',
  guest_image_source_image_invalid: 'form.image_url_invalid',
  guest_image_source_image_private: 'form.image_url_private',
  guest_image_source_image_required: 'form.source_image_required',
  guest_image_source_image_video: 'form.image_url_video',
  guest_image_web_search_unavailable: 'guest_web_search_unavailable',
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
  'sensitive content',
] as const;

const IMAGE_ACCESS_KEYWORDS = [
  'failed to load the image',
  'failed to fetch',
  'could not fetch',
  'failed to download',
  'forbidden',
  'unauthorized',
  'access denied',
  'not found',
  'unsupported image',
  'direct public image',
] as const;

function includesAny(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function getImageGeneratorErrorDescriptor({
  raw,
  errorCode,
  mode,
  imageUrl,
}: ResolveImageGeneratorErrorInput): ImageGeneratorErrorDescriptor {
  const normalizedRaw = stripProviderBranding(raw);
  const lower = normalizedRaw?.toLowerCase() ?? '';
  const imageRequiredMode = mode === 'image-to-image';
  const apiErrorKey = errorCode ? API_ERROR_TRANSLATION_KEYS[errorCode] : null;

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

  if (lower.includes('real person') || lower.includes('real-person')) {
    return { kind: 'translation', key: 'error_reference_unsupported' };
  }

  if (includesAny(lower, SAFETY_KEYWORDS)) {
    return { kind: 'translation', key: 'error_nsfw_blocked' };
  }

  if (
    normalizedRaw &&
    DIRECT_VALIDATION_PREFIXES.some((prefix) => lower.startsWith(prefix))
  ) {
    return { kind: 'raw', message: normalizedRaw };
  }

  if (
    imageRequiredMode &&
    imageUrl.trim() &&
    includesAny(lower, IMAGE_ACCESS_KEYWORDS)
  ) {
    return { kind: 'translation', key: 'error_image_url_access' };
  }

  if (lower.includes('unprocessable') || lower.includes('status: 422')) {
    return { kind: 'translation', key: 'error_input_validation' };
  }

  if (normalizedRaw) {
    return { kind: 'generic', reason: normalizedRaw };
  }

  return { kind: 'translation', key: 'error_unknown' };
}
