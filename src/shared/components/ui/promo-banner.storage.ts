import { PROMO_BANNER_SEEN_STORAGE_KEY } from '@/shared/lib/viewer-quota';

const PROMO_BANNER_SHOWING_VALUE = 'showing';
const PROMO_BANNER_SEEN_VALUE = 'seen';

let fallbackPromoBannerState: 'new' | 'showing' | 'seen' = 'new';

export function hasSeenPromoBanner() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(PROMO_BANNER_SEEN_STORAGE_KEY) ===
      PROMO_BANNER_SEEN_VALUE
    );
  } catch (error) {
    console.error('[promo-banner] failed to read first-visit state', {
      error,
    });
    return fallbackPromoBannerState === 'seen';
  }
}

export function claimPromoBannerFirstVisit() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const storedState = window.localStorage.getItem(
      PROMO_BANNER_SEEN_STORAGE_KEY
    );

    if (storedState === PROMO_BANNER_SEEN_VALUE) {
      fallbackPromoBannerState = 'seen';
      return false;
    }

    if (storedState === PROMO_BANNER_SHOWING_VALUE) {
      fallbackPromoBannerState = 'showing';
      return false;
    }

    fallbackPromoBannerState = 'showing';
    window.localStorage.setItem(
      PROMO_BANNER_SEEN_STORAGE_KEY,
      PROMO_BANNER_SHOWING_VALUE
    );
    return true;
  } catch (error) {
    console.error('[promo-banner] failed to claim first-visit state', {
      error,
    });

    if (
      fallbackPromoBannerState === 'seen' ||
      fallbackPromoBannerState === 'showing'
    ) {
      return false;
    }

    fallbackPromoBannerState = 'showing';
    return true;
  }
}

export function markPromoBannerSeen() {
  if (typeof window === 'undefined') {
    return;
  }

  fallbackPromoBannerState = 'seen';

  try {
    window.localStorage.setItem(
      PROMO_BANNER_SEEN_STORAGE_KEY,
      PROMO_BANNER_SEEN_VALUE
    );
  } catch (error) {
    console.error('[promo-banner] failed to persist first-visit state', {
      error,
    });
  }
}
