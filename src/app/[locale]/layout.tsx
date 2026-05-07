import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { routing } from '@/core/i18n/config';
import { getStaticLocaleParams } from '@/config/locale';
import { ThemeProvider } from '@/core/theme/provider';
import { AdsAttributionPersistence } from '@/shared/components/analytics/ads-attribution-persistence';
import { GoogleAdsTracker } from '@/shared/components/analytics/google-ads-tracker';
import { Toaster } from '@/shared/components/ui/sonner';
import { AppContextProvider } from '@/shared/contexts/app';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata();

export function generateStaticParams() {
  return getStaticLocaleParams();
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const authEnabled = Boolean(envConfigs.auth_secret.trim());

  return (
    <ThemeProvider defaultTheme={envConfigs.appearance} locale={locale}>
      <AppContextProvider authEnabled={authEnabled}>
        {children}
        <AdsAttributionPersistence />
        <GoogleAdsTracker />
        <Toaster position="top-center" richColors />
      </AppContextProvider>
    </ThemeProvider>
  );
}
