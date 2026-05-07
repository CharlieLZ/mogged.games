'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { useAppContext } from '@/shared/contexts/app';
import { setCookie } from '@/shared/lib/cookie';
import {
  ADS_ATTRIBUTION_COOKIE_NAME,
  buildAdsAttributionSnapshotFromUrl,
  serializeAdsAttributionCookie,
  shouldPersistAdsAttribution,
} from '@/shared/lib/ads-attribution';
import { resolveGoogleAdsConfigs } from '@/shared/lib/google-ads';

const COOKIE_TTL_DAYS = 90;

function AdsAttributionPersistenceContent() {
  const { configs } = useAppContext();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const googleAdsConfigs = resolveGoogleAdsConfigs(configs);

  useEffect(() => {
    if (!googleAdsConfigs.enabled) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const snapshot = buildAdsAttributionSnapshotFromUrl({
      url: new URL(window.location.href),
    });

    if (!shouldPersistAdsAttribution(snapshot)) {
      return;
    }

    setCookie(
      ADS_ATTRIBUTION_COOKIE_NAME,
      serializeAdsAttributionCookie(snapshot),
      COOKIE_TTL_DAYS
    );
  }, [googleAdsConfigs.enabled, search]);

  return null;
}

export function AdsAttributionPersistence() {
  return (
    <Suspense fallback={null}>
      <AdsAttributionPersistenceContent />
    </Suspense>
  );
}
