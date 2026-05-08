import '@/config/style/global.css';

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import NextTopLoader from 'nextjs-toploader';

import { getDocumentLocaleAttributes } from '@/config/locale';
import { getAppName, getAppUrl } from '@/shared/lib/brand';
import {
  SITE_BROWSERCONFIG_PATH,
  SITE_FAVICON_SVG_PATH,
  SITE_MANIFEST_PATH,
  SITE_METADATA_ICONS,
  SITE_THEME_COLOR,
} from '@/shared/lib/site-icons';
import { getAdsService } from '@/shared/services/ads';
import { getAffiliateService } from '@/shared/services/affiliate';
import { getAnalyticsService } from '@/shared/services/analytics';
import { getCustomerService } from '@/shared/services/customer_service';

const appName = getAppName();
const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: appName,
  appleWebApp: {
    capable: true,
    title: appName,
  },
  manifest: SITE_MANIFEST_PATH,
  icons: SITE_METADATA_ICONS,
  other: {
    'msapplication-TileColor': SITE_THEME_COLOR,
    'msapplication-config': SITE_BROWSERCONFIG_PATH,
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params?: Promise<{ locale?: string }>;
}>) {
  const routeParams = params ? await params : undefined;
  const { locale, dir } = getDocumentLocaleAttributes(routeParams?.locale);
  setRequestLocale(locale);

  const isProduction = process.env.NODE_ENV === 'production';
  const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true';

  // ads components
  let adsMetaTags = null;
  let adsHeadScripts = null;
  let adsBodyScripts = null;

  // analytics components
  let analyticsMetaTags = null;
  let analyticsHeadScripts = null;
  let analyticsBodyScripts = null;

  // affiliate components
  let affiliateMetaTags = null;
  let affiliateHeadScripts = null;
  let affiliateBodyScripts = null;

  // customer service components
  let customerServiceMetaTags = null;
  let customerServiceHeadScripts = null;
  let customerServiceBodyScripts = null;

  if (isProduction || isDebug) {
    const [adsService, analyticsService, affiliateService, customerService] =
      await Promise.all([
        getAdsService(),
        getAnalyticsService(),
        getAffiliateService(),
        getCustomerService(),
      ]);

    adsMetaTags = adsService.getMetaTags();
    adsHeadScripts = adsService.getHeadScripts();
    adsBodyScripts = adsService.getBodyScripts();

    analyticsMetaTags = analyticsService.getMetaTags();
    analyticsHeadScripts = analyticsService.getHeadScripts();
    analyticsBodyScripts = analyticsService.getBodyScripts();

    affiliateMetaTags = affiliateService.getMetaTags();
    affiliateHeadScripts = affiliateService.getHeadScripts();
    affiliateBodyScripts = affiliateService.getBodyScripts();

    customerServiceMetaTags = customerService.getMetaTags();
    customerServiceHeadScripts = customerService.getHeadScripts();
    customerServiceBodyScripts = customerService.getBodyScripts();
  }

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script defer data-domain="mogged.games" src="https://click.pageview.click/js/script.js"></script>
        {/* inject analytics head scripts as early as possible for tag diagnostics */}
        {analyticsHeadScripts}
        {/* inject analytics meta tags */}
        {analyticsMetaTags}
        <meta name="theme-color" content={SITE_THEME_COLOR} />
        <meta
          name="msapplication-TileImage"
          content="/images/icons/mstile-150x150.png"
        />
        <link
          rel="mask-icon"
          href={SITE_FAVICON_SVG_PATH}
          color={SITE_THEME_COLOR}
        />
        {/* inject ads meta tags */}
        {adsMetaTags}
        {/* inject ads head scripts */}
        {adsHeadScripts}

        {/* inject affiliate meta tags */}
        {affiliateMetaTags}
        {/* inject affiliate head scripts */}
        {affiliateHeadScripts}

        {/* inject customer service meta tags */}
        {customerServiceMetaTags}
        {/* inject customer service head scripts */}
        {customerServiceHeadScripts}
      </head>
      <body suppressHydrationWarning className="overflow-x-hidden">
        <NextTopLoader
          color="var(--primary)"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={true}
          easing="ease"
          speed={200}
        />

        {children}

        {/* inject ads body scripts */}
        {adsBodyScripts}

        {/* inject analytics body scripts */}
        {analyticsBodyScripts}

        {/* inject affiliate body scripts */}
        {affiliateBodyScripts}

        {/* inject customer service body scripts */}
        {customerServiceBodyScripts}
      </body>
    </html>
  );
}
