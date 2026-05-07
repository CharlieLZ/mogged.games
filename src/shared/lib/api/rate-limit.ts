import { getClientIpFromHeaders as getClientIpFromRequestHeaders } from '@/shared/lib/request-context';

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  reason?: 'limit_exceeded';
};

type RateLimitOptions = {
  uniqueTokenPerInterval: number;
  interval: number;
};

declare global {
  var __imageeditoraiRateLimitStore: Map<string, RateLimitState> | undefined;
}

function getStore() {
  if (!globalThis.__imageeditoraiRateLimitStore) {
    globalThis.__imageeditoraiRateLimitStore = new Map();
  }

  return globalThis.__imageeditoraiRateLimitStore;
}

function cleanupExpired(now: number, store: Map<string, RateLimitState>) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function getClientIpFromHeaders(headers: Headers) {
  return getClientIpFromRequestHeaders(headers);
}

export function buildUserRateLimitKey(
  prefix: string,
  headers: Headers,
  userId: string
) {
  return `${prefix}:${getClientIpFromHeaders(headers)}:${userId}`;
}

export function createRateLimitErrorResponse(
  result: RateLimitResult,
  message: string,
  options: {
    includeRetryAfter?: boolean;
  } = {}
) {
  const includeRetryAfter = options.includeRetryAfter ?? true;
  const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

  return Response.json(
    {
      code: -1,
      message,
      ...(includeRetryAfter ? { retryAfter: retryAfterSeconds } : {}),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.reset).toISOString(),
      },
    }
  );
}

export function rateLimit(options: RateLimitOptions) {
  const { uniqueTokenPerInterval, interval } = options;

  return async (key: string): Promise<RateLimitResult> => {
    const now = Date.now();
    const store = getStore();

    cleanupExpired(now, store);

    const existing = store.get(key);
    if (!existing || existing.resetAt <= now) {
      const reset = now + interval;
      store.set(key, {
        count: 1,
        resetAt: reset,
      });

      return {
        success: true,
        limit: uniqueTokenPerInterval,
        remaining: Math.max(0, uniqueTokenPerInterval - 1),
        reset,
      };
    }

    existing.count += 1;
    store.set(key, existing);

    const remaining = Math.max(0, uniqueTokenPerInterval - existing.count);
    if (existing.count > uniqueTokenPerInterval) {
      return {
        success: false,
        limit: uniqueTokenPerInterval,
        remaining: 0,
        reset: existing.resetAt,
        reason: 'limit_exceeded',
      };
    }

    return {
      success: true,
      limit: uniqueTokenPerInterval,
      remaining,
      reset: existing.resetAt,
    };
  };
}
