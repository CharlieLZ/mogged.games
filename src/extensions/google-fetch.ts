const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_ATTEMPTS = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readResponseBodySafe(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}));
  }

  return response.text().catch(() => '');
}

function buildErrorMessage(label: string, status: number, payload: unknown) {
  if (payload && typeof payload === 'object') {
    const googleError = (payload as { error?: { message?: string } }).error;
    if (googleError?.message) {
      return `[${label}] ${status}: ${googleError.message}`;
    }
  }

  if (typeof payload === 'string' && payload.trim()) {
    return `[${label}] ${status}: ${payload.trim().slice(0, 400)}`;
  }

  return `[${label}] ${status}`;
}

function wrapRequestError(label: string, error: unknown, timeoutMs: number) {
  if (error instanceof Error && error.message.startsWith(`[${label}]`)) {
    return error;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new Error(`[${label}] request timed out after ${timeoutMs}ms`);
  }

  const message = error instanceof Error ? error.message : String(error);
  return new Error(`[${label}] request failed: ${message}`);
}

export async function fetchJsonWithRetry<T>({
  url,
  init,
  label,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: {
  url: string;
  init?: RequestInit;
  label: string;
  timeoutMs?: number;
  maxAttempts?: number;
}): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return (await response.json()) as T;
      }

      const payload = await readResponseBodySafe(response);
      const error = new Error(buildErrorMessage(label, response.status, payload));
      lastError = error;

      if (attempt < maxAttempts && RETRYABLE_STATUSES.has(response.status)) {
        await sleep(300 * attempt);
        continue;
      }

      throw error;
    } catch (error) {
      clearTimeout(timeoutId);
      const wrappedError = wrapRequestError(label, error, timeoutMs);
      lastError = wrappedError;

      if (attempt >= maxAttempts) {
        throw wrappedError;
      }

      await sleep(300 * attempt);
    }
  }

  throw lastError || new Error(`[${label}] 未知请求失败`);
}
