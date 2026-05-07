'use client';

import { useEffect, useState } from 'react';

const LOAD_FALLBACK_DELAY_MS = 2000;
const IDLE_FALLBACK_DELAY_MS = 120;
const IDLE_TIMEOUT_MS = 1200;

type IdleCallbackHandle = number;
type IdleRequest = (
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
) => IdleCallbackHandle;
type IdleCancel = (handle: IdleCallbackHandle) => void;

export function useDeferredClientRender() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let activated = false;
    let idleId: IdleCallbackHandle | undefined;
    let idleFallbackId: number | undefined;
    let loadFallbackId: number | undefined;

    const markReady = () => {
      if (!cancelled) {
        setReady(true);
      }
    };

    const scheduleReady = () => {
      if (activated) {
        return;
      }

      activated = true;

      const requestIdle = window.requestIdleCallback as IdleRequest | undefined;
      if (typeof requestIdle === 'function') {
        idleId = requestIdle(markReady, { timeout: IDLE_TIMEOUT_MS });
        return;
      }

      idleFallbackId = window.setTimeout(markReady, IDLE_FALLBACK_DELAY_MS);
    };

    if (document.readyState === 'complete') {
      scheduleReady();
    } else {
      window.addEventListener('load', scheduleReady, { once: true });
      loadFallbackId = window.setTimeout(
        scheduleReady,
        LOAD_FALLBACK_DELAY_MS
      );
    }

    return () => {
      cancelled = true;
      window.removeEventListener('load', scheduleReady);

      if (idleId !== undefined) {
        const cancelIdle = window.cancelIdleCallback as IdleCancel | undefined;
        if (typeof cancelIdle === 'function') {
          cancelIdle(idleId);
        }
      }

      if (idleFallbackId !== undefined) {
        window.clearTimeout(idleFallbackId);
      }

      if (loadFallbackId !== undefined) {
        window.clearTimeout(loadFallbackId);
      }
    };
  }, []);

  return ready;
}
