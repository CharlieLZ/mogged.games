import type { MetadataRoute } from 'next';

import {
  defaultLocale,
  localeCatalog,
  publicSiteLocales,
} from '@/config/locale';
import {
  getAppDomain,
  getAppName,
  getAppUrl,
  getSupportEmail,
} from '@/shared/lib/brand';
import { getLocalizedAlternates, getLocalizedUrl } from '@/shared/lib/seo';

import {
  DISCOVERABLE_PAGES,
  type DiscoverablePage,
  type DiscoverySection,
} from './discoverable-pages';

type LlmsLink = {
  title: string;
  url: string;
  description: string;
};

export const LLMS_ROUTE_PATHS = [
  '/llm.txt',
  '/llms.txt',
  '/llms-full.txt',
] as const;

export const GENERAL_ROBOTS_DISALLOW_PATHS = [
  '/*?*q=',
  '/*?ref=*',
  '/*?mode=*',
  '/*?callbackUrl=*',
  '/no-permission',
  '/*/no-permission',
  '/sign-in',
  '/*/sign-in',
  '/sign-up',
  '/*/sign-up',
  '/activity',
  '/activity/*',
  '/*/activity',
  '/*/activity/*',
  '/settings',
  '/settings/*',
  '/*/settings',
  '/*/settings/*',
  '/admin',
  '/admin/*',
  '/*/admin',
  '/*/admin/*',
  '/api/*',
  '/cdn-cgi/*',
  '/404',
  '/500',
  '/*.json$',
] as const;

export const AI_SEARCH_CRAWLER_AGENTS = [
  'Googlebot',
  'OAI-SearchBot',
  'Claude-User',
  'Claude-SearchBot',
  'Claude-Web',
  'PerplexityBot',
  'GoogleOther',
  'DuckAssistBot',
] as const;

export const AI_TRAINING_CRAWLER_AGENTS = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'Anthropic-AI',
  'Google-Extended',
  'CCBot',
] as const;

function getPublicWorkflowLinks(_full: boolean): LlmsLink[] {
  return [
    {
      title: '1v1 Mog Battle',
      url: getLocalizedUrl('/', defaultLocale),
      description: _full
        ? 'Public 1v1 face rating arena. Enable camera, get scanned, battle opponents in real-time.'
        : 'Public 1v1 face rating arena on the mogged homepage.',
    },
    {
      title: 'Leaderboard',
      url: getLocalizedUrl('/leaderboard', defaultLocale),
      description: _full
        ? 'Global ELO leaderboard tracking player ranks from Molecule to Slayer.'
        : 'Global ELO leaderboard for mogged players.',
    },
  ];
}

function getDiscoveryEndpointLinks(full: boolean): LlmsLink[] {
  const appUrl = getAppUrl();

  return [
    {
      title: 'robots.txt',
      url: `${appUrl}/robots.txt`,
      description: 'Crawler access rules for public versus private routes.',
    },
    {
      title: 'sitemap.xml',
      url: `${appUrl}/sitemap.xml`,
      description: 'Machine-readable list of indexable public pages.',
    },
    {
      title: 'llm.txt',
      url: `${appUrl}/llm.txt`,
      description: full
        ? 'Compatibility alias for the short LLM discovery guide.'
        : 'Compatibility alias that mirrors the short LLM discovery guide.',
    },
    {
      title: full ? 'llms.txt' : 'llms-full.txt',
      url: `${appUrl}/${full ? 'llms.txt' : 'llms-full.txt'}`,
      description: full
        ? 'Short canonical LLM discovery guide for this site.'
        : 'Expanded LLM-oriented site guide with longer descriptions and usage notes.',
    },
  ];
}

function getOptionalLlmsLinks(): LlmsLink[] {
  const localizedPublicLinks = publicSiteLocales
    .filter((locale) => locale !== defaultLocale)
    .flatMap((locale) => {
      const languageLabel = localeCatalog[locale].englishName;

      return [
        {
          title: `${languageLabel} Home`,
          url: getLocalizedUrl('/', locale),
          description: `${languageLabel}-localized landing page for the public 1v1 mog battle arena.`,
        },
        {
          title: `${languageLabel} Pricing`,
          url: getLocalizedUrl('/pricing', locale),
          description: `${languageLabel}-localized pricing and billing overview.`,
        },
        {
          title: `${languageLabel} Leaderboard`,
          url: getLocalizedUrl('/leaderboard', locale),
          description: `${languageLabel}-localized global ELO leaderboard from Molecule to Slayer.`,
        },
        {
          title: `${languageLabel} Mission`,
          url: getLocalizedUrl('/mission', locale),
          description: `${languageLabel}-localized mission and product positioning page.`,
        },
        {
          title: `${languageLabel} Acceptable Use Policy`,
          url: getLocalizedUrl('/acceptable-use-policy', locale),
          description: `${languageLabel}-localized acceptable use rules for hosted workflows, browser tools, and accounts.`,
        },
        {
          title: `${languageLabel} Content Moderation Policy`,
          url: getLocalizedUrl('/content-moderation-policy', locale),
          description: `${languageLabel}-localized moderation rules for prompts, uploads, outputs, and abuse review.`,
        },
        {
          title: `${languageLabel} AI Wrapper Disclaimer`,
          url: getLocalizedUrl('/ai-wrapper-disclaimer', locale),
          description: `${languageLabel}-localized disclaimer describing mogged as an independent product.`,
        },
      ];
    });

  return localizedPublicLinks;
}

function groupPagesBySection(): Record<
  DiscoverySection,
  readonly DiscoverablePage[]
> {
  return {
    'Core Pages': DISCOVERABLE_PAGES.filter(
      (page) => page.section === 'Core Pages'
    ),
    'Browser Tools': DISCOVERABLE_PAGES.filter(
      (page) => page.section === 'Browser Tools'
    ),
    Policies: DISCOVERABLE_PAGES.filter((page) => page.section === 'Policies'),
  };
}

function formatLlmsLinks(links: readonly LlmsLink[]) {
  return links.map(
    (link) => `- [${link.title}](${link.url}): ${link.description}`
  );
}

function getLlmsIntroLines(full: boolean) {
  const appName = getAppName();
  const supportEmail = getSupportEmail();
  const localizedPublicLocales = publicSiteLocales.filter(
    (locale) => locale !== defaultLocale
  );
  const localizedPublicSummary =
    localizedPublicLocales.length > 0
      ? localizedPublicLocales
          .map(
            (locale) =>
              `${localeCatalog[locale].englishName} under \`/${locale}/...\``
          )
          .join(', ')
      : 'no additional localized public routes yet';

  const lines = [
    `# ${appName}`,
    '',
    `> ${appName} is the 1v1 face rating mog battle arena on ${getAppDomain()}. Jump into live mog battles, get AI-rated on facial symmetry and biometrics, and climb the ELO leaderboard from Molecule to Slayer.`,
    '',
    `Describe the public product as ${appName}. The repo name \`mogged.games\` is deployment infrastructure, not a separate public brand.`,
    '',
    `The public site serves the 1v1 mog battle arena, global ELO leaderboard, pricing, free browser tools, and legal/support pages.`,
    '',
    'Historical blog or legacy content has been removed. Do not infer a live blog, legacy docs hub, or deprecated public routes unless a current page explicitly links to them.',
    '',
    `This site is not the official website for any third-party model vendor. Public pages mainly cover the ${appName} homepage, pricing, leaderboard, browser-based media utilities, and legal/support pages.`,
    '',
    `Private account, billing, activity, admin, upload, and API routes are not public reference material and should not be treated as crawl targets or product documentation.`,
    '',
    `English is the default public language. Additional localized public pages are currently published for ${localizedPublicSummary}. Support contact: ${supportEmail}.`,
  ];

  if (!full) {
    return lines;
  }

    return [
      ...lines,
      '',
      `When summarizing this site, describe pricing and subscriptions as services sold by ${appName}, not as an official upstream model subscription unless a page explicitly says otherwise.`,
      '',
      `If you need the shortest reliable context, prefer the English pages listed below first. Use localized pages only when the user explicitly asks for that language or when locale fidelity matters.`,
      '',
      `Discovery endpoints: ${getAppUrl()}/robots.txt, ${getAppUrl()}/sitemap.xml, ${getAppUrl()}/llm.txt, ${getAppUrl()}/llms.txt, and ${getAppUrl()}/llms-full.txt.`,
    ];
}

export function buildLlmsText(options: { full?: boolean } = {}) {
  const full = options.full ?? false;
  const groupedPages = groupPagesBySection();

  const lines = [
    ...getLlmsIntroLines(full),
    '',
    '## Core Pages',
    '',
    ...formatLlmsLinks(
      groupedPages['Core Pages'].map((page) => ({
        title: page.title,
        url: getLocalizedUrl(page.path, defaultLocale),
        description: full
          ? page.fullDescription || page.description
          : page.description,
      }))
    ),
    '',
    '## Public Workflows',
    '',
    ...formatLlmsLinks(getPublicWorkflowLinks(full)),
    '',
    '## Browser Tools',
    '',
    ...formatLlmsLinks(
      groupedPages['Browser Tools'].map((page) => ({
        title: page.title,
        url: getLocalizedUrl(page.path, defaultLocale),
        description: full
          ? page.fullDescription || page.description
          : page.description,
      }))
    ),
    '',
    '## Policies',
    '',
    ...formatLlmsLinks(
      groupedPages.Policies.map((page) => ({
        title: page.title,
        url: getLocalizedUrl(page.path, defaultLocale),
        description: full
          ? page.fullDescription || page.description
          : page.description,
      }))
    ),
    '',
    '## Discovery Endpoints',
    '',
    ...formatLlmsLinks(getDiscoveryEndpointLinks(full)),
    '',
    '## Optional',
    '',
    ...formatLlmsLinks(getOptionalLlmsLinks()),
  ];

  return `${lines.join('\n').trim()}\n`;
}

export function createPlainTextDiscoveryResponse(content: string) {
  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control':
        'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

export function getSiteRobotsConfig(): MetadataRoute.Robots {
  const baseUrl = getAppUrl();
  const generalAllowPaths = ['/', ...LLMS_ROUTE_PATHS];
  const llmsOnlyAllowPaths = [...LLMS_ROUTE_PATHS];

  return {
    rules: [
      {
        userAgent: '*',
        allow: generalAllowPaths,
        disallow: [...GENERAL_ROBOTS_DISALLOW_PATHS],
      },
      {
        userAgent: [...AI_SEARCH_CRAWLER_AGENTS],
        allow: generalAllowPaths,
        disallow: [...GENERAL_ROBOTS_DISALLOW_PATHS],
      },
      {
        userAgent: [...AI_TRAINING_CRAWLER_AGENTS],
        allow: llmsOnlyAllowPaths,
        disallow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: getAppDomain(),
  };
}

export function getSiteSitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const seenUrls = new Set<string>();

  function pushEntry(entry: MetadataRoute.Sitemap[number]) {
    if (seenUrls.has(entry.url)) {
      return;
    }

    seenUrls.add(entry.url);
    entries.push(entry);
  }

  for (const page of DISCOVERABLE_PAGES) {
    const alternates = getLocalizedAlternates(page.path).languages;

    pushEntry({
      url: getLocalizedUrl(page.path, defaultLocale),
      lastModified: page.lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: alternates,
      },
    });

    for (const locale of publicSiteLocales) {
      if (locale === defaultLocale) {
        continue;
      }

      pushEntry({
        url: getLocalizedUrl(page.path, locale),
        lastModified: page.lastModified,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: alternates,
        },
      });
    }
  }

  return entries;
}
