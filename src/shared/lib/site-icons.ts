import type { Metadata } from 'next';

import { getAppName } from './brand';
import {
  SITE_BACKGROUND_COLOR,
  SITE_BRAND_LOGO_PATH,
  SITE_BRAND_MARK_PATH,
  SITE_THEME_COLOR,
} from './site-visuals';

export { SITE_BACKGROUND_COLOR, SITE_THEME_COLOR } from './site-visuals';

export const SITE_MANIFEST_PATH = '/site.webmanifest';
export const SITE_BROWSERCONFIG_PATH = '/browserconfig.xml';
export const SITE_FAVICON_SVG_PATH = SITE_BRAND_MARK_PATH;
export const SITE_LOGO_PATH = SITE_BRAND_LOGO_PATH;

export const REQUIRED_MANIFEST_SIZES = [
  16, 32, 36, 48, 57, 60, 64, 70, 72, 76, 96, 114, 120, 128, 144, 150, 152, 167,
  180, 192, 256, 310, 384, 512,
] as const;

function getPngIconPath(size: number) {
  if (size === 16 || size === 32 || size === 48) {
    return `/images/icons/favicon-${size}x${size}.png`;
  }

  if (size === 192 || size === 512) {
    return `/images/icons/android-chrome-${size}x${size}.png`;
  }

  return `/images/icons/icon-${size}x${size}.png`;
}

type SiteMetadataIcons = NonNullable<Exclude<Metadata['icons'], string | URL>>;

export const SITE_METADATA_ICONS = {
  icon: [
    { url: '/favicon.ico', type: 'image/x-icon' },
    { url: SITE_FAVICON_SVG_PATH, type: 'image/svg+xml' },
    {
      url: '/favicon-16x16.png',
      sizes: '16x16',
      type: 'image/png',
    },
    {
      url: '/favicon-32x32.png',
      sizes: '32x32',
      type: 'image/png',
    },
    {
      url: '/favicon-48x48.png',
      sizes: '48x48',
      type: 'image/png',
    },
    {
      url: '/images/icons/android-chrome-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      url: '/images/icons/android-chrome-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
  shortcut: '/favicon.ico',
  apple: [
    {
      url: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
    },
  ],
} satisfies SiteMetadataIcons;

export type SiteManifest = {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: 'standalone';
  background_color: string;
  theme_color: string;
  orientation: 'portrait-primary';
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  categories: string[];
  lang: 'en';
  dir: 'ltr';
  scope: string;
  screenshots: Array<Record<string, never>>;
};

export function getSiteManifest(): SiteManifest {
  const appName = getAppName();

  return {
    name: appName,
    short_name: appName,
    description: `${appName} is the public site for AI image editing, browser tools, pricing, and support.`,
    start_url: '/',
    display: 'standalone',
    background_color: SITE_BACKGROUND_COLOR,
    theme_color: SITE_THEME_COLOR,
    orientation: 'portrait-primary',
    icons: [
      ...REQUIRED_MANIFEST_SIZES.map((size) => ({
        src: getPngIconPath(size),
        sizes: `${size}x${size}`,
        type: 'image/png',
      })),
      {
        src: '/images/icons/maskable-icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/images/icons/maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/favicon.ico',
        sizes: '16x16 32x32 48x48 64x64 128x128 256x256',
        type: 'image/x-icon',
      },
    ],
    categories: ['technology', 'education', 'productivity'],
    lang: 'en',
    dir: 'ltr',
    scope: '/',
    screenshots: [],
  };
}

export const REQUIRED_ICON_FILES = [
  ...REQUIRED_MANIFEST_SIZES.map((size) =>
    getPngIconPath(size).replace(/^\//, '')
  ),
  'images/icons/apple-touch-icon-180x180.png',
  'images/icons/logo.png',
  'images/icons/maskable-icon-192x192.png',
  'images/icons/maskable-icon-512x512.png',
  'images/icons/mstile-70x70.png',
  'images/icons/mstile-144x144.png',
  'images/icons/mstile-150x150.png',
  'images/icons/mstile-310x150.png',
  'images/icons/mstile-310x310.png',
  'images/favicon/favicon.svg',
  'apple-touch-icon.png',
  'apple-touch-icon-precomposed.png',
  'browserconfig.xml',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon-48x48.png',
  'favicon.ico',
  'manifest.webmanifest',
  'site.webmanifest',
] as const;

export const DEPRECATED_ICON_FILES = [
  'images/favicon/favicon.ico',
  'images/favicon/logo-dark.png',
  'imgs/favicon/apple-touch-icon.png',
  'imgs/favicon/favicon-16x16.png',
  'imgs/favicon/favicon-32x32.png',
  'imgs/favicon/favicon-192x192.png',
  'imgs/favicon/favicon-512x512.png',
  'imgs/favicon/favicon-2048x2048.png',
  'imgs/favicon/favicon.ico',
  'imgs/favicon/favicon.svg',
] as const;
