import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { publicSiteLocales } from '@/config/locale';
import arLanding from '@/config/locale/messages/ar/landing.json';
import deLanding from '@/config/locale/messages/de/landing.json';
import enLanding from '@/config/locale/messages/en/landing.json';
import enPricing from '@/config/locale/messages/en/pricing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import {
  DISCOVERABLE_PAGES,
} from '@/shared/lib/discoverable-pages';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';

import { parseContentFrontmatter } from './content-frontmatter';
import { getLocalizedUrl } from './seo';


const englishCanonicalPageTdk = [
  {
    path: '/',
    title: "mogged | 1v1 Face Rating Battles - Get Mogged or Get Moggin'",
    keywords:
      'mogged, mog battle, face rating, 1v1 mog, mogged game, mogging, mog battle website, face rating game, mogged app, mogged.games',
    description:
      'mogged is the ultimate 1v1 face rating arena. Jump into live mog battles, get AI-rated on facial symmetry and biometrics, climb the leaderboard from Molecule to Slayer.',
  },
  {
    path: '/pricing',
    title: 'mogged Pricing | AI Image Credits, Plans, Billing',
    keywords:
      'mogged pricing, AI image credits, AI image editor plans, image generation pricing, mogged.games',
    description:
      'Compare mogged pricing, image credits, plans, and billing for image generation, image editing, and team delivery on mogged.games.',
  },
  {
    path: '/leaderboard',
    title: 'mogged Leaderboard | 1v1 Face Rating Rankings',
    keywords:
      'mogged leaderboard, ELO ranking, mog battle ranks, 1v1 face rating leaderboard, mogged.games',
    description:
      'Global ELO leaderboard for mogged 1v1 face rating battles. Track rank tiers from Molecule to Slayer.',
  },
  {
    path: '/free-tools/image-converter',
    title: 'Free Image Converter | PNG, JPG, WEBP - mogged',
    keywords:
      'free image converter, PNG to JPG, WEBP converter, browser image converter, mogged.games',
    description:
      'Convert PNG, JPG, and WEBP images in your browser for mogged uploads, profile setup, and avatar prep.',
  },
  {
    path: '/free-tools/image-color-extractor',
    title: 'Free Image Color Extractor | Palette & HEX - mogged',
    keywords:
      'image color extractor, color palette extractor, hex palette generator, browser color picker, mogged.games',
    description:
      'Extract dominant colors, HEX codes, and reusable palette tokens from images directly in your browser.',
  },
  {
    path: '/free-tools/image-compressor',
    title: 'Free Image Compressor | Reduce Image Size - mogged',
    keywords:
      'free image compressor, reduce image size, browser image compression, mogged',
    description:
      'Reduce image size in your browser for mogged profile pics, screenshots, and shared assets.',
  },
  {
    path: '/free-tools/video-converter',
    title: 'Free Video Converter | MP4, WEBM, MOV - mogged',
    keywords:
      'free video converter, MP4 to WEBM, MOV to MP4, browser video converter, mogged.games',
    description:
      'Convert MP4, WEBM, and MOV videos in your browser for mog battle clips and content sharing.',
  },
  {
    path: '/free-tools/video-trimmer',
    title: 'Free Video Trimmer | Cut Clips in Browser - mogged',
    keywords:
      'free video trimmer, cut video online, browser clip cutter, local video trim, mogged.games',
    description:
      'Trim MP4, WEBM, and MOV clips locally in your browser for battle clip highlights.',
  },
  {
    path: '/free-tools/video-to-gif',
    title: 'Free Video to GIF Converter Online | mogged',
    keywords:
      'free video to gif converter, GIF maker, browser GIF tool, mogged',
    description:
      'Turn mog battle clips into looping GIFs in your browser for sharing, chat, and social posts.',
  },
  {
    path: '/free-tools/video-thumbnail',
    title: 'Free Video Thumbnail Maker | Frame Capture - mogged',
    keywords:
      'video thumbnail maker, free frame capture, video screenshot, thumbnail generator, mogged.games',
    description:
      'Capture a clean frame from battle clips for thumbnails, covers, and preview cards.',
  },
  {
    path: '/mission',
    title: 'mogged Mission | 1v1 Face Rating Battles',
    keywords:
      'mogged mission, mog battle, face rating, 1v1 mog, mogged.games mission',
    description:
      'Learn why mogged exists for 1v1 mog battles, face rating, and competitive looksmaxxing on mogged.games.',
  },
  {
    path: '/privacy-policy',
    title: 'mogged Privacy Policy | Accounts, Billing & Data',
    keywords:
      'mogged privacy policy, hosted workflow privacy, billing privacy, mogged.games privacy policy',
    description:
      'How mogged handles account data, billing, prompts, uploads, local browser tools, and hosted workflow activity on mogged.games.',
  },
  {
    path: '/terms-of-service',
    title: 'mogged Terms of Service | Workspace, Credits, Tools',
    keywords:
      'mogged terms of service, workspace terms, credits and subscriptions, mogged.games terms',
    description:
      'Terms covering the mogged public site, face rating game, browser tools, credits, subscriptions, and service boundaries on mogged.games.',
  },
  {
    path: '/refund-policy',
    title: 'mogged Refund Policy | Credits and Billing',
    keywords:
      'mogged refund policy, credits refund, subscription refund, mogged.games refund policy',
    description:
      'Refund rules for mogged credits, subscriptions, completed jobs, unused purchases, and billing issues on mogged.games.',
  },
  {
    path: '/acceptable-use-policy',
    title: 'mogged Acceptable Use Policy | Workflows and Tools',
    keywords:
      'mogged acceptable use policy, prohibited use, workflow rules, mogged.games acceptable use',
    description:
      'Rules covering mogged accounts, face rating game battles, browser tools, credits, subscriptions, and prohibited uses on mogged.games.',
  },
  {
    path: '/content-moderation-policy',
    title: 'mogged Moderation Policy | Prompts & Outputs',
    keywords:
      'mogged content moderation policy, prompt review, output review, mogged.games moderation',
    description:
      'How mogged reviews prompts, uploaded files, battle ratings, safety blocks, and abuse patterns on mogged.games.',
  },
  {
    path: '/ai-wrapper-disclaimer',
    title: 'mogged Wrapper Disclaimer | Product Boundary',
    keywords:
      'mogged wrapper disclaimer, independent product, provider boundary, mogged.games disclaimer',
    description:
      'Explains the boundary between mogged, upstream models, third-party providers, and the services sold on mogged.games.',
  },
] as const;

const canonicalContentSlugs = [
  'mission',
  'privacy-policy',
  'terms-of-service',
  'refund-policy',
  'acceptable-use-policy',
  'content-moderation-policy',
  'ai-wrapper-disclaimer',
] as const;

function getEnglishContentTdk(path: string) {
  const slug = path.replace(/^\//, '');
  const source = readFileSync(
    join(process.cwd(), 'content/pages', `${slug}.mdx`),
    'utf8'
  );
  const frontmatter = parseContentFrontmatter(source);

  return {
    title: frontmatter.seo_title || frontmatter.title || '',
    keywords: frontmatter.keywords || '',
    description: frontmatter.description || '',
  };
}

function getEnglishRouteTdk(path: string) {
  if (path === '/') {
    const metadata = replaceBrandTokensDeep(enLanding.metadata);
    return metadata;
  }

  if (path === '/pricing') {
    const metadata = replaceBrandTokensDeep(enPricing.metadata);
    return metadata;
  }

  if (path === '/leaderboard') {
    const page = DISCOVERABLE_PAGES.find((entry) => entry.path === '/leaderboard');
    return {
      title: page?.fullDescription?.includes('leaderboard') ? 'mogged Leaderboard | 1v1 Face Rating Rankings' : (page?.title || 'mogged Leaderboard'),
      keywords: 'mogged leaderboard, ELO ranking, mog battle ranks, 1v1 face rating leaderboard, mogged.games',
      description: page?.description || '',
    };
  }

  if (path.startsWith('/free-tools/')) {
    const toolKey = path.replace('/free-tools/', '').replaceAll('-', '_');
    const toolCopy = enLanding.free_tools[
      toolKey as keyof typeof enLanding.free_tools
    ] as {
      metadata: {
        title: string;
        keywords: string;
        description: string;
      };
    };

    return replaceBrandTokensDeep(toolCopy.metadata);
  }

  return getEnglishContentTdk(path);
}

describe('public SEO TDK', () => {
  it('locks English canonical page title, keywords, description, URL, and canonical targets', () => {
    expect(englishCanonicalPageTdk).toHaveLength(17);

    for (const expected of englishCanonicalPageTdk) {
      const actual = getEnglishRouteTdk(expected.path);

      expect(actual, expected.path).toEqual({
        title: expected.title,
        keywords: expected.keywords,
        description: expected.description,
      });
      expect(getLocalizedUrl(expected.path, 'en'), expected.path).toBe(
        expected.path === '/'
          ? 'https://mogged.games'
          : `https://mogged.games${expected.path}`
      );
    }
  });

  it('keeps every public locale mogged-branded for core metadata', () => {
    for (const locale of publicSiteLocales) {
      const landingByLocale: Record<string, { metadata: { title: string; keywords: string; description: string } }> = {
        en: enLanding,
        zh: zhLanding,
        de: deLanding as unknown as { metadata: { title: string; keywords: string; description: string } },
        ar: arLanding as unknown as { metadata: { title: string; keywords: string; description: string } },
      };
      const landing = landingByLocale[locale];
      if (!landing) {
        continue;
      }
      const landingMetadata = replaceBrandTokensDeep(landing.metadata);

      expect(landingMetadata.title, locale).toContain('mogged');
      expect(landingMetadata.description, locale).not.toMatch(
        /video generator|视频生成器|Videogenerator|générateur vidéo/i
      );
    }
  });

  it('keeps sitemap-indexed browser video tools visible from each locale footer', () => {
    const requiredVideoLinks = [
      '/free-tools/video-converter',
      '/free-tools/video-to-gif',
    ];

    for (const locale of publicSiteLocales) {
      const landingByLocale: Record<string, { footer: { nav: { items: Array<{ children: Array<{ url: string }> }> } } }> = {
        en: enLanding,
        zh: zhLanding,
        de: deLanding as unknown as { footer: { nav: { items: Array<{ children: Array<{ url: string }> }> } } },
        ar: arLanding as unknown as { footer: { nav: { items: Array<{ children: Array<{ url: string }> }> } } },
      };
      const landing = landingByLocale[locale];
      if (!landing) {
        continue;
      }
      const footerUrls = landing.footer.nav.items.flatMap(
        (section) => section.children.map((item) => item.url)
      );

      expect(footerUrls, locale).toEqual(
        expect.arrayContaining(requiredVideoLinks)
      );
      expect(footerUrls, locale).not.toContain('/ai-video-generator');
      expect(footerUrls, locale).not.toContain('/ai-image-generator');
    }
  });

  it('keeps public trust page frontmatter localized for every live locale', () => {
    for (const locale of publicSiteLocales) {
      for (const slug of canonicalContentSlugs) {
        const filename =
          locale === 'en' ? `${slug}.mdx` : `${slug}.${locale}.mdx`;
        const source = readFileSync(
          join(process.cwd(), 'content/pages', filename),
          'utf8'
        );
        const frontmatter = parseContentFrontmatter(source);

        expect(frontmatter.title, `${locale}:${slug}`).toContain(
          'mogged'
        );
        expect(frontmatter.description, `${locale}:${slug}`).toContain(
          'mogged.games'
        );
        expect(frontmatter.keywords, `${locale}:${slug}`).toContain(
          'mogged.games'
        );
      }
    }
  });
});
