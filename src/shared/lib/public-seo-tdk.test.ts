import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { publicSiteLocales } from '@/config/locale';
import arLanding from '@/config/locale/messages/ar/landing.json';
import arPricing from '@/config/locale/messages/ar/pricing.json';
import deLanding from '@/config/locale/messages/de/landing.json';
import dePricing from '@/config/locale/messages/de/pricing.json';
import enLanding from '@/config/locale/messages/en/landing.json';
import enPricing from '@/config/locale/messages/en/pricing.json';
import esLanding from '@/config/locale/messages/es/landing.json';
import esPricing from '@/config/locale/messages/es/pricing.json';
import frLanding from '@/config/locale/messages/fr/landing.json';
import frPricing from '@/config/locale/messages/fr/pricing.json';
import itLanding from '@/config/locale/messages/it/landing.json';
import itPricing from '@/config/locale/messages/it/pricing.json';
import jaLanding from '@/config/locale/messages/ja/landing.json';
import jaPricing from '@/config/locale/messages/ja/pricing.json';
import koLanding from '@/config/locale/messages/ko/landing.json';
import koPricing from '@/config/locale/messages/ko/pricing.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import zhPricing from '@/config/locale/messages/zh/pricing.json';
import {
  getGeneratorRootSeoCopy,
} from '@/shared/lib/ai-video-generator-seo';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';

import { getImageGeneratorRootSeoCopy } from './ai-image-generator-seo';
import { parseContentFrontmatter } from './content-frontmatter';
import { getLocalizedUrl } from './seo';

const landingByLocale = {
  en: enLanding,
  zh: zhLanding,
  de: deLanding,
  fr: frLanding,
  es: esLanding,
  ja: jaLanding,
  it: itLanding,
  ko: koLanding,
  ar: arLanding,
} as const;

const pricingByLocale = {
  en: enPricing,
  zh: zhPricing,
  de: dePricing,
  fr: frPricing,
  es: esPricing,
  ja: jaPricing,
  it: itPricing,
  ko: koPricing,
  ar: arPricing,
} as const;

const englishCanonicalPageTdk = [
  {
    path: '/',
    title: 'mogged | Free AI Image Editor & Photo Editor',
    keywords:
      'image, image editor, image editor ai, ai image editor, free online image editor, photo editor, picture editor, text to image, image to image, mogged.games',
    description:
      'mogged is a free online image editor for AI image editing, photo editing, text-to-image, image-to-image, and browser image tools on mogged.games.',
  },
  {
    path: '/ai-image-generator',
    title: 'AI Image Generator | mogged Online Workspace',
    keywords:
      'image, image editor, image editor ai, ai image generator, ai image editor, ai photo editor, picture editor, online image editor, text-to-image, image-to-image, mogged.games',
    description:
      'Use mogged as an AI image generator and image editor for text-to-image, image-to-image, photo editing, and picture refinement in one workspace.',
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
    path: '/ai-video-generator',
    title: 'AI Video Generator | Text, Image & Ref - mogged',
    keywords:
      'ai video generator, text-to-video, image-to-video, reference-to-video, Seedance 2.0, mogged.games',
    description:
      'Generate AI videos with mogged using text-to-video, image-to-video, and reference-to-video workflows for concept drafts and shot control.',
  },
  {
    path: '/free-tools/image-converter',
    title: 'Free Image Converter | PNG, JPG, WEBP - mogged',
    keywords:
      'free image converter, PNG to JPG, WEBP converter, browser image converter, mogged.games',
    description:
      'Convert PNG, JPG, and WEBP images in your browser before mogged uploads, client reviews, product listings, or final export handoff.',
  },
  {
    path: '/free-tools/image-color-extractor',
    title: 'Free Image Color Extractor | Palette & HEX - mogged',
    keywords:
      'image color extractor, color palette extractor, hex palette generator, browser color picker, mogged.games',
    description:
      'Extract dominant colors, HEX codes, and reusable palette tokens from images directly in your browser before design review or frontend handoff.',
  },
  {
    path: '/free-tools/image-compressor',
    title: 'Free Image Compressor | Reduce Image Size - mogged',
    keywords:
      'free image compressor, reduce image size, browser image compression, mogged',
    description:
      'Reduce image size in your browser before sharing screenshots, boards, product stills, and mogged exports so reviews stay lightweight.',
  },
  {
    path: '/free-tools/video-converter',
    title: 'Free Video Converter | MP4, WEBM, MOV - mogged',
    keywords:
      'free video converter, MP4 to WEBM, MOV to MP4, browser video converter, mogged.games',
    description:
      'Convert MP4, WEBM, and MOV videos in your browser before reviewing, publishing, embedding, or delivering mogged clips.',
  },
  {
    path: '/free-tools/video-trimmer',
    title: 'Free Video Trimmer | Cut Clips in Browser - mogged',
    keywords:
      'free video trimmer, cut video online, browser clip cutter, local video trim, mogged.games',
    description:
      'Trim MP4, WEBM, and MOV clips locally in your browser before review, thumbnailing, GIF export, support docs, or final delivery handoff.',
  },
  {
    path: '/free-tools/video-to-gif',
    title: 'Free Video to GIF Converter Online | mogged',
    keywords:
      'free video to gif converter, GIF maker, browser GIF tool, mogged',
    description:
      'Turn short videos into looping GIFs in your browser for docs, chat, support replies, launch posts, and mogged clip previews.',
  },
  {
    path: '/free-tools/video-thumbnail',
    title: 'Free Video Thumbnail Maker | Frame Capture - mogged',
    keywords:
      'video thumbnail maker, free frame capture, video screenshot, thumbnail generator, mogged.games',
    description:
      'Capture a clean video frame in your browser for thumbnails, covers, docs, listings, and preview cards before publishing or sharing.',
  },
  {
    path: '/mission',
    title: 'mogged Mission | AI Image Editing Workspace',
    keywords:
      'mogged mission, AI image editing workspace, mogged product direction, mogged.games mission',
    description:
      'Learn why mogged exists for AI image editing, text-to-image, image-to-image, browser tools, and hosted video workflows on mogged.games.',
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
      'Terms covering the mogged public site, hosted workspace, browser tools, credits, subscriptions, and service boundaries on mogged.games.',
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
      'Rules covering mogged accounts, hosted image and video workflows, browser tools, credits, subscriptions, and prohibited uses on mogged.games.',
  },
  {
    path: '/content-moderation-policy',
    title: 'mogged Moderation Policy | Prompts & Outputs',
    keywords:
      'mogged content moderation policy, prompt review, output review, mogged.games moderation',
    description:
      'How mogged reviews prompts, uploaded files, generated outputs, safety blocks, and abuse patterns on mogged.games.',
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

  if (path === '/ai-image-generator') {
    const copy = getImageGeneratorRootSeoCopy('en');

    return {
      title: copy.metadataTitle,
      keywords: copy.keywords,
      description: copy.description,
    };
  }

  if (path === '/pricing') {
    const metadata = replaceBrandTokensDeep(enPricing.metadata);
    return metadata;
  }

  if (path === '/ai-video-generator') {
    const copy = getGeneratorRootSeoCopy('en');

    return {
      title: copy.metadataTitle,
      keywords: copy.keywords,
      description: copy.description,
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
    expect(englishCanonicalPageTdk).toHaveLength(18);

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

  it('keeps every public locale image-first for core metadata', () => {
    for (const locale of publicSiteLocales) {
      const landingMetadata = replaceBrandTokensDeep(
        landingByLocale[locale].metadata
      );
      const imageMetadata = getImageGeneratorRootSeoCopy(locale);
      const pricingKeywords = replaceBrandTokensDeep(
        pricingByLocale[locale].metadata.keywords
      );

      expect(landingMetadata.title, locale).toContain('mogged');
      expect(landingMetadata.keywords, locale).toContain('image editor ai');
      expect(landingMetadata.description, locale).not.toMatch(
        /video generator|视频生成器|Videogenerator|générateur vidéo/i
      );
      expect(imageMetadata.metadataTitle, locale).toContain('mogged');
      expect(imageMetadata.keywords, locale).toContain('ai image editor');
      expect(pricingKeywords, locale).toContain('mogged');
    }
  });

  it('keeps sitemap-indexed browser video tools visible from each locale footer', () => {
    const requiredVideoLinks = [
      '/free-tools/video-converter',
      '/free-tools/video-thumbnail',
      '/free-tools/video-to-gif',
    ];

    for (const locale of publicSiteLocales) {
      const footerUrls = landingByLocale[locale].footer.nav.items.flatMap(
        (section) => section.children.map((item) => item.url)
      );

      expect(footerUrls, locale).toEqual(
        expect.arrayContaining(requiredVideoLinks)
      );
      expect(footerUrls, locale).not.toContain('/ai-video-generator');
      expect(footerUrls, locale).not.toContain('/pricing');
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
