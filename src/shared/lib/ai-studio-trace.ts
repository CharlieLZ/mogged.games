import type { AIStudioAttempt, AIStudioTrace } from '@/extensions/ai/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAttempt(value: unknown): AIStudioAttempt | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.provider !== 'string' ||
    typeof value.model !== 'string' ||
    typeof value.status !== 'string'
  ) {
    return null;
  }

  if (!['success', 'failed', 'skipped'].includes(value.status)) {
    return null;
  }

  return {
    provider: value.provider,
    model: value.model,
    label: typeof value.label === 'string' ? value.label : undefined,
    status: value.status as AIStudioAttempt['status'],
    error: typeof value.error === 'string' ? value.error : undefined,
    timestamp:
      typeof value.timestamp === 'string' ? value.timestamp : undefined,
  };
}

export function parseJsonRecord(value: unknown) {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value !== 'string') {
    return isRecord(value) ? value : {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function parseStudioTraceFromUnknown(
  value: unknown
): AIStudioTrace | undefined {
  if (!isRecord(value) || !isRecord(value.studio)) {
    return undefined;
  }

  const studio = value.studio;
  const attempts = Array.isArray(studio.attempts)
    ? studio.attempts
        .map((item) => normalizeAttempt(item))
        .filter((item): item is AIStudioAttempt => item !== null)
    : [];

  if (
    typeof studio.requestedModel !== 'string' ||
    typeof studio.scene !== 'string' ||
    typeof studio.activeProvider !== 'string' ||
    typeof studio.activeModel !== 'string'
  ) {
    return undefined;
  }

  return {
    requestedProvider:
      typeof studio.requestedProvider === 'string'
        ? studio.requestedProvider
        : 'studio',
    requestedModel: studio.requestedModel,
    scene: studio.scene,
    activeProvider: studio.activeProvider,
    activeModel: studio.activeModel,
    attempts,
    updatedAt:
      typeof studio.updatedAt === 'string'
        ? studio.updatedAt
        : new Date().toISOString(),
  };
}

export function parseStudioTraceFromJson(value: unknown) {
  return parseStudioTraceFromUnknown(parseJsonRecord(value));
}
