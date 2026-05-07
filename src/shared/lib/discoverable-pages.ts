import type { MetadataRoute } from 'next';

import {
  getPublicPageLastModified,
} from '@/config/website/public-page-metadata';

type SitemapEntry = MetadataRoute.Sitemap[number];

export type DiscoverySection = 'Core Pages' | 'Browser Tools' | 'Policies';

export type DiscoverablePage = {
  path: string;
  title: string;
  section: DiscoverySection;
  description: string;
  fullDescription?: string;
  changeFrequency: SitemapEntry['changeFrequency'];
  priority: number;
  lastModified?: Date;
};

function normalizeSitePath(path: string) {
  if (!path || path === '.') {
    return '/';
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized === '/' ? '/' : normalized.replace(/\/+$/, '');
}

export const DISCOVERABLE_PAGES: readonly DiscoverablePage[] = [
  {
    path: '/',
    title: 'mogged',
    section: 'Core Pages',
    description:
      'Homepage for mogged covering the 1v1 face rating arena, ELO ranking, leaderboard, pricing, FAQ, and browser-based tools.',
    fullDescription:
      'The homepage defines mogged as the 1v1 face rating mog battle arena and explains the battle system, ELO ranking, pricing, FAQ, and browser-based tools.',
    changeFrequency: 'daily',
    priority: 1,
    lastModified: getPublicPageLastModified('/'),
  },
  {
    path: '/pricing',
    title: 'mogged Pricing',
    section: 'Core Pages',
    description:
      'Pricing, credits, subscriptions, and billing FAQ for mogged.',
    fullDescription:
      'Use this page when you need the public summary of mogged pricing, credits, plans, subscriptions, and billing expectations.',
    changeFrequency: 'weekly',
    priority: 0.95,
    lastModified: getPublicPageLastModified('/pricing'),
  },
  {
    path: '/leaderboard',
    title: 'mogged Leaderboard',
    section: 'Core Pages',
    description:
      'Global ELO leaderboard for mogged 1v1 face rating battles. Track rank tiers from Molecule to Slayer.',
    fullDescription:
      'The public leaderboard shows the global ELO standings for mogged players. Ranks range from Molecule (0 ELO) to Slayer (2000+ ELO).',
    changeFrequency: 'hourly',
    priority: 0.92,
    lastModified: getPublicPageLastModified('/leaderboard'),
  },
  {
    path: '/mission',
    title: 'mogged Mission',
    section: 'Policies',
    description:
      'Explains what mogged is, who it serves, and why the 1v1 face rating arena exists.',
    fullDescription:
      'Use this page when you want the clearest public summary of the product mission, supported modes, and support contact path on mogged.games.',
    changeFrequency: 'monthly',
    priority: 0.78,
    lastModified: getPublicPageLastModified('/mission'),
  },
];

export const DISCOVERABLE_SINGLE_SEGMENT_SLUGS = new Set(
  DISCOVERABLE_PAGES.map((page) => normalizeSitePath(page.path))
    .filter((path) => path !== '/')
    .map((path) => path.split('/').filter(Boolean))
    .filter((segments) => segments.length === 1)
    .map((segments) => segments[0])
);

export function isDiscoverablePublicPath(path: string) {
  const normalizedPath = normalizeSitePath(path);
  return DISCOVERABLE_PAGES.some(
    (page) => normalizeSitePath(page.path) === normalizedPath
  );
}
