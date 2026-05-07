/**
 * Cloudflare Workers/OpenNext compatibility guard.
 *
 * Keep this file named `middleware.ts` and keep exporting `middleware()`.
 * Next.js 16 warns that `middleware` is deprecated in favor of `proxy`, but
 * `proxy.ts` uses the Node.js Proxy runtime and Cloudflare/OpenNext 1.18.x
 * still does not support Node Middleware in Workers.
 *
 * The local Next warning is expected. Do not rename this file to `proxy.ts`
 * until `pnpm cf:build` proves OpenNext handles that entrypoint in Workers.
 */
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from '@/core/i18n/config';
import {
  getDefaultLocaleCanonicalPath,
} from '@/core/i18n/localized-path';
import { hasBetterAuthSessionCookie } from '@/shared/lib/auth-session-cookie';
import { getCanonicalHostRedirectUrl } from '@/shared/lib/canonical-host-redirect';
import { DISCOVERABLE_SINGLE_SEGMENT_SLUGS } from '@/shared/lib/discoverable-pages';
import { getIndexNowRuntimeKey } from '@/shared/lib/indexnow-key';

const intlMiddleware = createIntlMiddleware(routing);
const noIndexExact = new Set([
  'no-permission',
  'sign-in',
  'sign-up',
  'forgot-password',
  'privacy-policy',
  'terms-of-service',
  'refund-policy',
  'acceptable-use-policy',
  'content-moderation-policy',
  'ai-wrapper-disclaimer',
]);
const noIndexPrefixes = [
  'activity',
  'settings',
  'admin',
  'reset-password',
  'free-tools',
];

function normalizePath(pathname: string) {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (parts[0] && routing.locales.includes(parts[0] as any)) {
    parts.shift();
  }
  return parts.join('/');
}

function shouldNoIndex(normalizedPath: string) {
  if (noIndexExact.has(normalizedPath)) {
    return true;
  }

  for (const prefix of noIndexPrefixes) {
    if (normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)) {
      return true;
    }
  }

  if (
    normalizedPath &&
    !normalizedPath.includes('/') &&
    !DISCOVERABLE_SINGLE_SEGMENT_SLUGS.has(normalizedPath)
  ) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const canonicalHostRedirectUrl = getCanonicalHostRedirectUrl(request.url);

  if (canonicalHostRedirectUrl) {
    return NextResponse.redirect(canonicalHostRedirectUrl, 308);
  }

  const indexNowMatch = pathname.match(/^\/([a-f0-9]{8,128})\.txt$/i);

  if (indexNowMatch) {
    const configuredKey = getIndexNowRuntimeKey();
    const requestedKey = indexNowMatch[1];

    if (
      configuredKey &&
      requestedKey.toLowerCase() === configuredKey.toLowerCase()
    ) {
      return new NextResponse(configuredKey, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control':
            'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }

    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  if (pathname.endsWith('.txt')) {
    return NextResponse.next();
  }

  if (pathname === '/sitemap.xml') {
    return NextResponse.next();
  }

  const canonicalDefaultLocalePath = getDefaultLocaleCanonicalPath(pathname);
  if (canonicalDefaultLocalePath && canonicalDefaultLocalePath !== pathname) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.pathname = canonicalDefaultLocalePath;
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const intlResponse = intlMiddleware(request);

  const locale = pathname.split('/')[1];
  const isValidLocale = routing.locales.includes(locale as any);
  const pathWithoutLocale = isValidLocale
    ? pathname.slice(locale.length + 1)
    : pathname;

  if (
    pathWithoutLocale.startsWith('/admin') ||
    pathWithoutLocale.startsWith('/settings') ||
    pathWithoutLocale.startsWith('/activity')
  ) {
    if (!hasBetterAuthSessionCookie(request)) {
      const signInUrl = new URL(
        isValidLocale ? `/${locale}/sign-in` : '/sign-in',
        request.url
      );
      const callbackPath = pathWithoutLocale + request.nextUrl.search;
      signInUrl.searchParams.set('callbackUrl', callbackPath);
      return NextResponse.redirect(signInUrl);
    }
  }

  const normalizedMiddlewarePath = normalizePath(pathname);
  if (shouldNoIndex(normalizedMiddlewarePath)) {
    intlResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  intlResponse.headers.set('x-pathname', request.nextUrl.pathname);
  intlResponse.headers.set('x-url', request.url);

  return intlResponse;
}

export const config = {
  matcher: [
    '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
    '/robots.txt',
    '/sitemap.xml',
    '/llm.txt',
    '/llms.txt',
    '/llms-full.txt',
    '/:indexNowKey.txt',
  ],
};
