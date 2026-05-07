'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ViewerCreditsSnapshot {
  remainingCredits: number;
  expiresAt: string | null;
  dailyClaim: {
    claimedToday: boolean;
    creditsAmount: number;
  };
}

export interface GuestQuotaSnapshot {
  dateKey: string;
  limit: number;
  remaining: number;
  resetAt?: string | null;
  used: number;
}

export interface ViewerInfoSnapshot {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isGuest: boolean;
  imageQueueTier?: 'guest' | 'free' | 'paid';
  quotaTotal?: number;
  credits: ViewerCreditsSnapshot | null;
  guestQuota: GuestQuotaSnapshot | null;
}

const VIEWER_INFO_CACHE_TTL_MS = 15_000;
const VIEWER_INFO_REQUEST_TIMEOUT_MS = 12_000;
const VIEWER_INFO_MAX_ATTEMPTS = 2;

type ViewerInfoRequestOptions = {
  force?: boolean;
};

let viewerInfoCache: {
  expiresAt: number;
  value: ViewerInfoSnapshot;
} | null = null;
let viewerInfoRequest: Promise<ViewerInfoSnapshot | null> | null = null;

function getCachedViewerInfo() {
  if (!viewerInfoCache || viewerInfoCache.expiresAt <= Date.now()) {
    return null;
  }

  return viewerInfoCache.value;
}

function createViewerInfoTimeoutSignal() {
  if (
    typeof AbortSignal !== 'undefined' &&
    typeof AbortSignal.timeout === 'function'
  ) {
    return {
      signal: AbortSignal.timeout(VIEWER_INFO_REQUEST_TIMEOUT_MS),
      cleanup: () => undefined,
    };
  }

  if (typeof AbortController === 'undefined') {
    return {
      signal: undefined,
      cleanup: () => undefined,
    };
  }

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => {
    controller.abort();
  }, VIEWER_INFO_REQUEST_TIMEOUT_MS);

  return {
    signal: controller.signal,
    cleanup: () => globalThis.clearTimeout(timeout),
  };
}

function createViewerInfoError(message: string, status?: number) {
  const error = new Error(message) as Error & {
    retryable?: boolean;
    status?: number;
  };

  if (status !== undefined) {
    error.status = status;
  }

  return error;
}

function createRetryableViewerInfoError(message: string, status?: number) {
  const error = createViewerInfoError(message, status);
  error.retryable = true;

  return error;
}

function getViewerInfoErrorStatus(error: unknown) {
  const status = (error as { status?: unknown } | null)?.status;

  return typeof status === 'number' ? status : undefined;
}

function getViewerInfoErrorName(error: unknown) {
  return error instanceof Error && error.name ? error.name : typeof error;
}

function getViewerInfoErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function isAbortLikeViewerInfoError(error: unknown) {
  return (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}

function isRetryableViewerInfoError(error: unknown) {
  if ((error as { retryable?: unknown } | null)?.retryable === true) {
    return true;
  }

  const status = getViewerInfoErrorStatus(error);

  if (status !== undefined) {
    return status === 408 || status === 429 || status >= 500;
  }

  return isAbortLikeViewerInfoError(error) || error instanceof TypeError;
}

async function readViewerInfoPayload(response: Response) {
  try {
    return await response.json();
  } catch {
    throw createRetryableViewerInfoError(
      'viewer info returned invalid json',
      response.status
    );
  }
}

async function fetchViewerInfoSnapshotOnce() {
  const timeout = createViewerInfoTimeoutSignal();

  try {
    const response = await fetch('/api/user/get-viewer-info', {
      method: 'GET',
      cache: 'no-store',
      signal: timeout.signal,
    });
    if (!response.ok) {
      throw createViewerInfoError(
        `viewer info failed with status ${response.status}`,
        response.status
      );
    }

    const payload = await readViewerInfoPayload(response);
    if (payload?.code !== 0 || !payload?.data) {
      throw createViewerInfoError(payload?.message || 'viewer info failed');
    }

    return payload.data as ViewerInfoSnapshot;
  } finally {
    timeout.cleanup();
  }
}

async function requestViewerInfoSnapshot({
  force = false,
}: ViewerInfoRequestOptions = {}) {
  if (!force) {
    const cached = getCachedViewerInfo();
    if (cached) {
      return cached;
    }
  }

  if (viewerInfoRequest) {
    return viewerInfoRequest;
  }

  viewerInfoRequest = (async () => {
    let attemptCount = 0;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= VIEWER_INFO_MAX_ATTEMPTS; attempt += 1) {
      attemptCount = attempt;

      try {
        const value = await fetchViewerInfoSnapshotOnce();
        viewerInfoCache = {
          expiresAt: Date.now() + VIEWER_INFO_CACHE_TTL_MS,
          value,
        };

        return value;
      } catch (error) {
        lastError = error;

        if (
          attempt < VIEWER_INFO_MAX_ATTEMPTS &&
          isRetryableViewerInfoError(error)
        ) {
          continue;
        }

        break;
      }
    }

    console.warn('[viewer-info] fetch failed', {
      attemptCount,
      errorMessage: getViewerInfoErrorMessage(lastError),
      errorName: getViewerInfoErrorName(lastError),
      status: getViewerInfoErrorStatus(lastError),
      step: 'fetch-viewer-info',
    });

    return null;
  })().finally(() => {
    viewerInfoRequest = null;
  });

  return viewerInfoRequest;
}

export function useViewerInfo({ enabled = true }: { enabled?: boolean } = {}) {
  const mountedRef = useRef(false);
  const [viewerInfo, setViewerInfo] = useState<ViewerInfoSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const enabledRef = useRef(enabled);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    return () => {
      requestVersionRef.current += 1;
    };
  }, []);

  const refreshViewerInfo = useCallback(
    async (options: ViewerInfoRequestOptions = { force: true }) => {
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;

      if (typeof fetch !== 'function') {
        if (
          mountedRef.current &&
          requestVersionRef.current === requestVersion &&
          enabledRef.current
        ) {
          setIsLoading(false);
        }
        return null;
      }

      if (mountedRef.current) {
        setIsLoading(true);
      }

      const nextViewerInfo = await requestViewerInfoSnapshot(options);
      if (
        !mountedRef.current ||
        requestVersionRef.current !== requestVersion ||
        !enabledRef.current
      ) {
        return nextViewerInfo;
      }

      if (nextViewerInfo) {
        setViewerInfo(nextViewerInfo);
      }

      setIsLoading(false);

      return nextViewerInfo;
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestVersionRef.current += 1;
      setIsLoading(false);
      return;
    }

    void refreshViewerInfo({ force: false });
  }, [enabled, refreshViewerInfo]);

  return {
    viewerInfo,
    isLoading,
    refreshViewerInfo,
  };
}
