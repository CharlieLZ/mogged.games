const MAX_IDEMPOTENCY_KEY_LENGTH = 120;
const DEFAULT_MEMORY_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

type AIGenerateMemoryIdempotencyStatus =
  | 'processing'
  | 'completed'
  | 'failed';

type AIGenerateMemoryIdempotencyRecord = {
  userId: string;
  scope: string;
  idempotencyKey: string;
  requestHash: string;
  status: AIGenerateMemoryIdempotencyStatus;
  responsePayload: Record<string, unknown> | null;
  errorMessage: string | null;
  expiresAt: number;
  updatedAt: number;
};

type ClaimAIGenerateMemoryIdempotencyInput = {
  userId: string;
  scope: string;
  idempotencyKey: string;
  requestHash: string;
  ttlMs?: number;
};

type CompleteAIGenerateMemoryIdempotencyInput = {
  userId: string;
  scope: string;
  idempotencyKey: string;
  responsePayload: Record<string, unknown>;
  ttlMs?: number;
};

type FailAIGenerateMemoryIdempotencyInput = {
  userId: string;
  scope: string;
  idempotencyKey: string;
  errorMessage?: string;
  ttlMs?: number;
};

type ClaimAIGenerateMemoryIdempotencyResult =
  | {
      kind: 'claimed';
      record: AIGenerateMemoryIdempotencyRecord;
    }
  | {
      kind: 'existing';
      record: AIGenerateMemoryIdempotencyRecord;
    };

declare global {
  var __imageeditoraiAIGenerateMemoryIdempotencyStore:
    | Map<string, AIGenerateMemoryIdempotencyRecord>
    | undefined;
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function getMemoryIdempotencyStore() {
  if (!globalThis.__imageeditoraiAIGenerateMemoryIdempotencyStore) {
    globalThis.__imageeditoraiAIGenerateMemoryIdempotencyStore = new Map();
  }

  return globalThis.__imageeditoraiAIGenerateMemoryIdempotencyStore;
}

function buildMemoryStoreKey(input: {
  userId: string;
  scope: string;
  idempotencyKey: string;
}) {
  return `${input.userId}:${input.scope}:${input.idempotencyKey}`;
}

function getExpiresAt(ttlMs = DEFAULT_MEMORY_IDEMPOTENCY_TTL_MS) {
  return Date.now() + Math.max(1000, ttlMs);
}

function cleanupExpiredMemoryIdempotency(now: number) {
  const store = getMemoryIdempotencyStore();

  for (const [key, record] of store.entries()) {
    if (record.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function claimAIGenerateMemoryIdempotency(
  input: ClaimAIGenerateMemoryIdempotencyInput
): ClaimAIGenerateMemoryIdempotencyResult {
  const now = Date.now();
  cleanupExpiredMemoryIdempotency(now);

  const store = getMemoryIdempotencyStore();
  const storeKey = buildMemoryStoreKey(input);
  const existing = store.get(storeKey);

  if (existing && existing.expiresAt > now) {
    return {
      kind: 'existing',
      record: existing,
    };
  }

  const record: AIGenerateMemoryIdempotencyRecord = {
    userId: input.userId,
    scope: input.scope,
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    status: 'processing',
    responsePayload: null,
    errorMessage: null,
    expiresAt: getExpiresAt(input.ttlMs),
    updatedAt: now,
  };

  store.set(storeKey, record);

  return {
    kind: 'claimed',
    record,
  };
}

export function completeAIGenerateMemoryIdempotency(
  input: CompleteAIGenerateMemoryIdempotencyInput
) {
  const now = Date.now();
  cleanupExpiredMemoryIdempotency(now);

  const store = getMemoryIdempotencyStore();
  const storeKey = buildMemoryStoreKey(input);
  const existing = store.get(storeKey);
  const record: AIGenerateMemoryIdempotencyRecord = {
    userId: input.userId,
    scope: input.scope,
    idempotencyKey: input.idempotencyKey,
    requestHash: existing?.requestHash || '',
    status: 'completed',
    responsePayload: input.responsePayload,
    errorMessage: null,
    expiresAt: getExpiresAt(input.ttlMs),
    updatedAt: now,
  };

  store.set(storeKey, record);
  return record;
}

export function failAIGenerateMemoryIdempotency(
  input: FailAIGenerateMemoryIdempotencyInput
) {
  const now = Date.now();
  cleanupExpiredMemoryIdempotency(now);

  const store = getMemoryIdempotencyStore();
  const storeKey = buildMemoryStoreKey(input);
  const existing = store.get(storeKey);
  const record: AIGenerateMemoryIdempotencyRecord = {
    userId: input.userId,
    scope: input.scope,
    idempotencyKey: input.idempotencyKey,
    requestHash: existing?.requestHash || '',
    status: 'failed',
    responsePayload: existing?.responsePayload || null,
    errorMessage: normalizeText(input.errorMessage, 500),
    expiresAt: getExpiresAt(input.ttlMs),
    updatedAt: now,
  };

  store.set(storeKey, record);
  return record;
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(
        ([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`
      )
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function digestToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');
}

export function normalizeAIGenerateIdempotencyKey(
  value?: string | null
): string | null {
  const normalized = normalizeText(value, MAX_IDEMPOTENCY_KEY_LENGTH);
  if (!normalized || normalized.length < 8) {
    return null;
  }

  return normalized;
}

export async function createAIGenerateRequestHash(
  payload: Record<string, unknown>
): Promise<string> {
  const content = stableStringify(payload);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(content)
  );

  return digestToHex(digest);
}

export function parseAIGenerateIdempotencyResponse(
  responsePayload?: string | null
): Record<string, unknown> | null {
  if (!responsePayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(responsePayload);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function isAIGenerateIdempotencyStorageError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? '').trim();

  return (
    message.includes('ai_generate_idempotency') &&
    (message.includes('does not exist') ||
      message.includes('no such table') ||
      message.includes('relation'))
  );
}
