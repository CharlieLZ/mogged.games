'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter as useNextRouter, useSearchParams } from 'next/navigation';
import { Languages, Sparkles, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { usePathname } from '@/core/i18n/navigation';
import { AppLocale, localeNames, localeSelectorLocales } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import { cacheGet, cacheSet } from '@/shared/lib/cache';
import {
  buildLocaleSwitchHref,
  persistLocalePreference,
  PREFERRED_LOCALE_KEY,
} from '@/shared/lib/locale-routing';
import { getTimestamp } from '@/shared/lib/time';
import { cn } from '@/shared/lib/utils';

const DISMISSED_KEY = 'locale-suggestion-dismissed';
const DISMISSED_EXPIRY_DAYS = 1; // Expiry in days

function LocaleDetectorContent() {
  const t = useTranslations('common.locale_detector');
  const currentLocale = useLocale();
  const router = useNextRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showPopup, setShowPopup] = useState(false);
  const [browserLocale, setBrowserLocale] = useState<AppLocale | null>(null);
  const hasCheckedRef = useRef(false);

  const isAppLocale = (locale: string): locale is AppLocale => {
    return localeSelectorLocales.includes(locale as AppLocale);
  };

  const detectBrowserLocale = (): AppLocale | null => {
    if (typeof window === 'undefined') return null;

    const browserLang = navigator.language || (navigator as any).userLanguage;
    const langCode = browserLang.split('-')[0].toLowerCase();

    // Check if the detected language is in our supported locales
    if (isAppLocale(langCode)) {
      return langCode;
    }

    return null;
  };

  const isDismissed = (): boolean => {
    const dismissedData = cacheGet(DISMISSED_KEY);
    if (!dismissedData) return false;

    return true;
  };

  const setDismissed = () => {
    const expiresAt = getTimestamp() + DISMISSED_EXPIRY_DAYS * 24 * 60 * 60;
    cacheSet(DISMISSED_KEY, 'true', expiresAt);
  };

  const switchToLocale = useCallback(
    (locale: AppLocale) => {
      persistLocalePreference(locale);
      router.replace(
        buildLocaleSwitchHref({
          pathname,
          locale,
          search: searchParams,
          hash: typeof window !== 'undefined' ? window.location.hash : null,
        })
      );
      setShowPopup(false);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    // Only run initial check once to avoid interference with manual locale switches
    if (hasCheckedRef.current) {
      return;
    }

    hasCheckedRef.current = true;

    // Get browser locale
    const detectedLocale = detectBrowserLocale();
    setBrowserLocale(detectedLocale);

    // Check if user has dismissed the banner or already set a preference
    const dismissed = isDismissed();
    const preferredLocale = cacheGet(PREFERRED_LOCALE_KEY);

    // If user has previously clicked to switch locale, auto-switch to that preference
    if (
      preferredLocale &&
      preferredLocale !== currentLocale &&
      isAppLocale(preferredLocale)
    ) {
      switchToLocale(preferredLocale);
      return;
    }

    // Show banner if:
    // 1. Browser locale is different from current locale
    // 2. User hasn't dismissed the banner (or dismissal has expired)
    // 3. Browser locale is supported
    // 4. User hasn't set a preference yet (no auto-switch, only show banner)
    if (
      detectedLocale &&
      detectedLocale !== currentLocale &&
      !dismissed &&
      !preferredLocale
    ) {
      setShowPopup(true);
    }
  }, [currentLocale, switchToLocale]);

  const handleSwitch = () => {
    if (browserLocale) {
      switchToLocale(browserLocale);
    }
  };

  const handleDismiss = () => {
    setDismissed();
    setShowPopup(false);
  };

  if (!showPopup || !browserLocale) {
    return null;
  }

  const targetLocaleName =
    localeNames[browserLocale as keyof typeof localeNames] || browserLocale;

  return (
    <div
      className={cn(
        'fixed right-4 bottom-4 z-[70] w-[min(calc(100vw-2rem),24rem)]',
        'sm:right-5 sm:bottom-5',
        'rtl:right-auto rtl:left-4 sm:rtl:right-auto sm:rtl:left-5'
      )}
    >
      <div className="bg-card/90 border-border/60 shadow-foreground/10 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl">
              <Languages className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-foreground flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="text-primary h-3.5 w-3.5" />
                {t('tip_label')}
              </div>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                {t('title', { locale: targetLocaleName })}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
            aria-label={t('dismiss_label')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleSwitch}
            size="sm"
            className="h-9 rounded-xl px-4 shadow-sm"
          >
            {t('switch_to', { locale: targetLocaleName })}
          </Button>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground inline-flex h-9 items-center rounded-xl px-3 text-xs font-medium transition-colors"
          >
            {t('not_now')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LocaleDetector() {
  return (
    <Suspense fallback={null}>
      <LocaleDetectorContent />
    </Suspense>
  );
}
