type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeJsonbInput<T = unknown>(value: T | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return trimmed as T;
  }
}

export function parseDbJsonValue<T = unknown>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return value as T;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

export function parseDbJsonRecord(value: unknown): JsonRecord | null {
  const parsed = parseDbJsonValue(value);
  return isJsonRecord(parsed) ? parsed : null;
}

export function parseDbJsonArray<T = unknown>(value: unknown): T[] {
  const parsed = parseDbJsonValue(value);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

export function serializeDbJsonValue<T = unknown>(
  value: T | null | undefined
): T | string | null {
  return normalizeJsonbInput(value);
}

export function stringifyDbJsonValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? value : null;
  }

  return JSON.stringify(value);
}

export function stringifyComparableJson(value: unknown): string | null {
  const parsed = parseDbJsonValue(value);

  if (parsed === null) {
    return null;
  }

  return JSON.stringify(parsed);
}
