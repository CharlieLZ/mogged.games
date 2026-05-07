import { parseJsonRecord } from './utils';

export type SeedanceFailureCategory =
  | 'content_policy'
  | 'input_validation'
  | 'provider_auth'
  | 'provider_config'
  | 'provider_endpoint'
  | 'provider_query_missing'
  | 'provider_temporary'
  | 'unknown';

export type SeedanceFallbackDecision = {
  shouldFallback: boolean;
  category: SeedanceFailureCategory;
  errorCode?: string;
  errorMessage?: string;
  apiEndpoint?: string;
};

const BLOCKED_FALLBACK_CATEGORIES: ReadonlySet<SeedanceFailureCategory> =
  new Set([
    'content_policy',
    'input_validation',
    'provider_config',
    'provider_query_missing',
  ]);

const DIRECT_VALIDATION_PREFIXES = [
  'aspect_ratio',
  'resolution',
  'output_format',
  'image_url',
  'prompt ',
] as const;

const CONTENT_POLICY_KEYWORDS = [
  'outputvideosensitivecontentdetected',
  'sensitive content',
  'sensitive information',
  'nsfw',
  'safety',
  'content checker',
  'policy',
  'moderation',
  'unsafe',
] as const;

const INPUT_VALIDATION_KEYWORDS = [
  'unprocessable entity',
  'invalid parameter',
  'invalid request',
  'must be',
  'unsupported format',
  'unsupported image',
  'failed to load image',
  'failed to load the image',
  'could not load image',
  'failed to fetch the image',
  'failed to fetch',
  'failed to download',
  'unable to download',
  'image file is not corrupted',
  'direct public image',
] as const;

const PROVIDER_AUTH_KEYWORDS = [
  'unauthorized',
  'forbidden',
  'access denied',
  'not authorized',
  'invalid api key',
  'invalid key',
  'authentication failed',
  'authorization failed',
  'auth failed',
  'permission denied',
] as const;

const PROVIDER_CONFIG_KEYWORDS = [
  'not configured',
  'missing credentials',
  'missing api key',
] as const;

const PROVIDER_ENDPOINT_KEYWORDS = [
  'base url',
  'base_url',
  'endpoint',
  'route not found',
  'path not found',
  'api not found',
] as const;

const PROVIDER_QUERY_MISSING_KEYWORDS = [
  'task not found',
  'task id not found',
  'taskid not found',
  'record not found',
  'job not found',
  'prediction not found',
  'request id not found',
  'no such task',
  'does not exist',
] as const;

const RETRYABLE_UPSTREAM_KEYWORDS = [
  'temporarily unavailable',
  'temporary outage',
  'timeout',
  'timed out',
  'etimedout',
  'econnreset',
  'econnrefused',
  'network error',
  'network request failed',
  'fetch failed',
  'upstream',
  'overloaded',
  'internal server error',
  'bad gateway',
  'gateway timeout',
  'service unavailable',
  'try again later',
  'too many requests',
  'rate limit',
  'rate limited',
  'quota exceeded',
  'capacity exceeded',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function includesAny(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeErrorSource(value: unknown) {
  if (value instanceof Error) {
    return {
      errorMessage: value.message,
      errorCode:
        getString((value as Error & { code?: unknown }).code) || value.name,
      httpStatus: getFiniteNumber(
        (value as Error & { httpStatus?: unknown; status?: unknown }).httpStatus ??
          (value as Error & { status?: unknown }).status
      ),
      apiEndpoint: getString(
        (value as Error & { apiEndpoint?: unknown }).apiEndpoint
      ),
      stage: getString((value as Error & { stage?: unknown }).stage),
    };
  }

  const parsed = parseJsonRecord(value);
  return isRecord(parsed) ? parsed : {};
}

export function classifySeedanceFailure(input: {
  taskInfo?: unknown;
  taskResult?: unknown;
  error?: unknown;
}): SeedanceFallbackDecision {
  const info = normalizeErrorSource(input.taskInfo);
  const result = normalizeErrorSource(input.taskResult);
  const error = normalizeErrorSource(input.error);

  const errorMessage =
    getString(info.errorMessage) ||
    getString(info.error_message) ||
    getString(result.errorMessage) ||
    getString(result.error_message) ||
    getString(result.error) ||
    getString(result.message) ||
    getString(error.errorMessage) ||
    getString(error.error_message) ||
    getString(error.message);

  const errorCode =
    getString(info.errorCode) ||
    getString(info.error_code) ||
    getString(result.errorCode) ||
    getString(result.error_code) ||
    getString(result.code) ||
    getString(error.errorCode) ||
    getString(error.error_code) ||
    getString(error.code);

  const apiEndpoint =
    getString(info.responseUrl) ||
    getString(info.response_url) ||
    getString(info.statusUrl) ||
    getString(info.status_url) ||
    getString(result.responseUrl) ||
    getString(result.response_url) ||
    getString(result.statusUrl) ||
    getString(result.status_url) ||
    getString(result.url) ||
    getString(error.apiEndpoint);

  const httpStatus =
    getFiniteNumber(info.httpStatus) ||
    getFiniteNumber(info.status) ||
    getFiniteNumber(info.errorCode) ||
    getFiniteNumber(info.error_code) ||
    getFiniteNumber(result.httpStatus) ||
    getFiniteNumber(result.statusCode) ||
    getFiniteNumber(result.status_code) ||
    getFiniteNumber(result.errorCode) ||
    getFiniteNumber(result.error_code) ||
    getFiniteNumber(error.httpStatus);

  const combined = [errorCode, errorMessage, apiEndpoint, String(httpStatus ?? '')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const normalizedMessage = errorMessage?.toLowerCase() || '';

  if (includesAny(combined, CONTENT_POLICY_KEYWORDS)) {
    return {
      shouldFallback: false,
      category: 'content_policy',
      errorCode,
      errorMessage,
      apiEndpoint,
    };
  }

  if (includesAny(combined, PROVIDER_CONFIG_KEYWORDS)) {
    return {
      shouldFallback: false,
      category: 'provider_config',
      errorCode,
      errorMessage,
      apiEndpoint,
    };
  }

  if (
    httpStatus === 404 &&
    includesAny(combined, PROVIDER_QUERY_MISSING_KEYWORDS)
  ) {
    return {
      shouldFallback: false,
      category: 'provider_query_missing',
      errorCode,
      errorMessage,
      apiEndpoint,
    };
  }

  if (
    DIRECT_VALIDATION_PREFIXES.some((prefix) =>
      normalizedMessage.startsWith(prefix)
    ) ||
    includesAny(combined, INPUT_VALIDATION_KEYWORDS) ||
    /\b(400|409|410|413|415|422)\b/.test(combined)
  ) {
    return {
      shouldFallback: false,
      category: 'input_validation',
      errorCode,
      errorMessage,
      apiEndpoint,
    };
  }

  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    includesAny(combined, PROVIDER_AUTH_KEYWORDS)
  ) {
    return {
      shouldFallback: true,
      category: 'provider_auth',
      errorCode,
      errorMessage,
      apiEndpoint,
    };
  }

  if (
    httpStatus === 404 ||
    includesAny(combined, PROVIDER_ENDPOINT_KEYWORDS)
  ) {
    return {
      shouldFallback: true,
      category: 'provider_endpoint',
      errorCode,
      errorMessage,
      apiEndpoint,
    };
  }

  if (
    includesAny(combined, RETRYABLE_UPSTREAM_KEYWORDS) ||
    /\b(429|500|502|503|504)\b/.test(combined)
  ) {
    return {
      shouldFallback: true,
      category: 'provider_temporary',
      errorCode,
      errorMessage,
      apiEndpoint,
    };
  }

  return {
    shouldFallback: false,
    category: 'unknown',
    errorCode,
    errorMessage,
    apiEndpoint,
  };
}

export function shouldBlockSeedanceProviderFallback(
  decision: Pick<SeedanceFallbackDecision, 'category'>
) {
  return BLOCKED_FALLBACK_CATEGORIES.has(decision.category);
}
