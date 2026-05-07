import { envConfigs } from '@/config';
import { getAppDomain, getAppUrl } from '@/shared/lib/brand';
import {
  DEFAULT_INDEXNOW_KEY,
  INDEXNOW_KEY_PATTERN,
  isValidIndexNowKey,
  resolveIndexNowKey,
} from '@/shared/lib/indexnow-key';

export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
export const INDEXNOW_MAX_URLS_PER_REQUEST = 10_000;
export {
  DEFAULT_INDEXNOW_KEY,
  INDEXNOW_KEY_PATTERN,
  isValidIndexNowKey,
  resolveIndexNowKey,
};

type SubmitBatchResult = {
  status: number;
  body: string;
  submittedCount: number;
};

export type IndexNowSubmitResult = {
  host: string;
  submittedUrls: string[];
  batches: SubmitBatchResult[];
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeIndexNowUrl(input: string, expectedHost: string) {
  try {
    const url = new URL(input);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    if (url.host !== expectedHost) {
      return null;
    }

    url.hash = '';
    if (!url.pathname) {
      url.pathname = '/';
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function getIndexNowKey(required = false) {
  const key = resolveIndexNowKey(envConfigs.indexnow_key);

  if (!key) {
    if (required) {
      throw new Error(
        'INDEXNOW_KEY is missing. Provide a custom key or use the built-in default key.'
      );
    }

    return '';
  }

  return key;
}

export function getIndexNowKeyLocation(required = false) {
  const key = getIndexNowKey(required);

  if (!key) {
    return '';
  }

  return `${getAppUrl()}/${key}.txt`;
}

export function normalizeIndexNowUrls(urls: readonly string[]) {
  const host = getAppDomain();
  const seen = new Set<string>();

  return urls.reduce<string[]>((result, input) => {
    const normalized = normalizeIndexNowUrl(input, host);
    if (!normalized || seen.has(normalized)) {
      return result;
    }

    seen.add(normalized);
    result.push(normalized);
    return result;
  }, []);
}

function chunkUrls(urls: readonly string[], size: number) {
  const batches: string[][] = [];

  for (let index = 0; index < urls.length; index += size) {
    batches.push(urls.slice(index, index + size));
  }

  return batches;
}

function shouldRetryIndexNowStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503;
}

async function submitIndexNowBatch({
  host,
  urlList,
  key,
  keyLocation,
  endpoint,
  maxRetries,
}: {
  host: string;
  urlList: string[];
  key: string;
  keyLocation: string;
  endpoint: string;
  maxRetries: number;
}) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host,
        key,
        keyLocation,
        urlList,
      }),
    });

    const body = await response.text();

    if (response.ok) {
      return {
        status: response.status,
        body,
        submittedCount: urlList.length,
      };
    }

    if (!shouldRetryIndexNowStatus(response.status) || attempt === maxRetries) {
      throw new Error(
        `IndexNow submission failed with ${response.status}: ${body || 'empty response'}`
      );
    }

    attempt += 1;
    await wait(400 * attempt);
  }

  throw new Error('IndexNow submission exhausted retries unexpectedly.');
}

export async function submitIndexNowUrls(
  urls: readonly string[],
  options?: {
    endpoint?: string;
    maxBatchSize?: number;
    maxRetries?: number;
  }
): Promise<IndexNowSubmitResult> {
  const host = getAppDomain();
  const key = getIndexNowKey(true);
  const keyLocation = getIndexNowKeyLocation(true);
  const normalizedUrls = normalizeIndexNowUrls(urls);
  const endpoint = options?.endpoint || INDEXNOW_ENDPOINT;
  const maxBatchSize = Math.min(
    options?.maxBatchSize || INDEXNOW_MAX_URLS_PER_REQUEST,
    INDEXNOW_MAX_URLS_PER_REQUEST
  );
  const maxRetries = Math.max(0, options?.maxRetries ?? 2);

  if (normalizedUrls.length === 0) {
    return {
      host,
      submittedUrls: [],
      batches: [],
    };
  }

  const keyLocationUrl = new URL(keyLocation);
  if (keyLocationUrl.host !== host) {
    throw new Error(
      `IndexNow keyLocation host mismatch: expected ${host}, received ${keyLocationUrl.host}`
    );
  }

  const batches: SubmitBatchResult[] = [];

  for (const urlList of chunkUrls(normalizedUrls, maxBatchSize)) {
    const batch = await submitIndexNowBatch({
      host,
      urlList,
      key,
      keyLocation,
      endpoint,
      maxRetries,
    });
    batches.push(batch);
  }

  return {
    host,
    submittedUrls: normalizedUrls,
    batches,
  };
}
