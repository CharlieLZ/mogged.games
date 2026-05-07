'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { useAppContext } from '@/shared/contexts/app';
import {
  resolveGoogleAdsConfigs,
  trackGoogleAdsConversion,
  trackGoogleAdsSignupConversion,
} from '@/shared/lib/google-ads';

const SIGNUP_TRACK_WINDOW_MS = 20 * 60 * 1000;
const PURCHASE_STORAGE_PREFIX = 'google_ads_purchase_tracked:';

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function trimString(value: string | null): string {
  return value?.trim() || '';
}

function cleanupPurchaseQueryParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete('google_ads_purchase');
  url.searchParams.delete('google_ads_value');
  url.searchParams.delete('google_ads_currency');
  url.searchParams.delete('order_no');

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

function GoogleAdsTrackerContent() {
  const { user, configs } = useAppContext();
  const searchParams = useSearchParams();
  const googleAdsConfigs = resolveGoogleAdsConfigs(configs);
  const search = searchParams.toString();

  useEffect(() => {
    if (
      !googleAdsConfigs.enabled ||
      !user?.id ||
      !googleAdsConfigs.conversionId ||
      !googleAdsConfigs.signupLabel
    ) {
      return;
    }

    const createdAt = parseDate(user.createdAt);
    if (!createdAt) {
      return;
    }

    if (Date.now() - createdAt.getTime() > SIGNUP_TRACK_WINDOW_MS) {
      return;
    }

    trackGoogleAdsSignupConversion({
      configs,
      userId: user.id,
      email: user.email,
    });
  }, [
    configs,
    googleAdsConfigs.enabled,
    googleAdsConfigs.conversionId,
    googleAdsConfigs.signupLabel,
    user?.createdAt,
    user?.email,
    user?.id,
  ]);

  useEffect(() => {
    if (
      !googleAdsConfigs.enabled ||
      googleAdsConfigs.purchaseTrackingMode !== 'browser' ||
      !googleAdsConfigs.conversionId ||
      !googleAdsConfigs.purchaseLabel ||
      !search
    ) {
      if (search.includes('google_ads_purchase=1')) {
        cleanupPurchaseQueryParams();
      }
      return;
    }

    const params = new URLSearchParams(search);
    const shouldTrackPurchase = params.get('google_ads_purchase') === '1';
    const orderNo = trimString(params.get('order_no'));

    if (!shouldTrackPurchase || !orderNo) {
      return;
    }

    const storageKey = `${PURCHASE_STORAGE_PREFIX}${orderNo}`;
    if (window.localStorage.getItem(storageKey) === '1') {
      cleanupPurchaseQueryParams();
      return;
    }

    const value = Number.parseFloat(trimString(params.get('google_ads_value')));
    const tracked = trackGoogleAdsConversion({
      conversionId: googleAdsConfigs.conversionId,
      label: googleAdsConfigs.purchaseLabel,
      value: Number.isFinite(value) ? value : undefined,
      currency: trimString(params.get('google_ads_currency')) || 'USD',
      transactionId: orderNo,
    });

    if (tracked) {
      window.localStorage.setItem(storageKey, '1');
      cleanupPurchaseQueryParams();
    }
  }, [
    googleAdsConfigs.enabled,
    googleAdsConfigs.purchaseLabel,
    googleAdsConfigs.purchaseTrackingMode,
    googleAdsConfigs.conversionId,
    search,
  ]);

  return null;
}

export function GoogleAdsTracker() {
  return (
    <Suspense fallback={null}>
      <GoogleAdsTrackerContent />
    </Suspense>
  );
}
