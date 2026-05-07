import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { publicSiteLocales } from '@/config/locale';
import { replaceBrandTokens } from '@/shared/lib/brand';

import {
  getImageGeneratorModeSeoCopy,
  getImageGeneratorRootSeoCopy,
} from './ai-image-generator-seo';
import {
  getGeneratorModeSeoCopy,
  getGeneratorRootSeoCopy,
} from './ai-video-generator-seo';
import { parseContentFrontmatter } from './content-frontmatter';

type MetadataEntry = {
  source: string;
  title: string;
  description: string;
};

const LATIN_TITLE_MAX = 70;
const OTHER_TITLE_MAX = 50;
const DESCRIPTION_MAX = 200;
const EN_INDEXABLE_TITLE_MIN = 50;
const EN_INDEXABLE_TITLE_MAX = 60;
const EN_DESCRIPTION_MIN = 120;
const EN_DESCRIPTION_MAX = 160;
const PUBLIC_POLICY_SLUGS = [
  'mission',
  'privacy-policy',
  'terms-of-service',
  'refund-policy',
  'acceptable-use-policy',
  'content-moderation-policy',
  'ai-wrapper-disclaimer',
] as const;
const TOOL_METADATA_KEYS = [
  'free_tools.index.metadata',
  'free_tools.image_converter.metadata',
  'free_tools.image_color_extractor.metadata',
  'free_tools.image_compressor.metadata',
  'free_tools.image_cropper.metadata',
  'free_tools.image_resizer.metadata',
  'free_tools.image_upscaler.metadata',
  'free_tools.image_rotator.metadata',
  'free_tools.image_metadata_remover.metadata',
  'free_tools.video_converter.metadata',
  'free_tools.video_trimmer.metadata',
  'free_tools.video_to_gif.metadata',
  'free_tools.video_thumbnail.metadata',
] as const;
const AI_GENERATOR_MODES = [
  'text-to-video',
  'image-to-video',
  'reference-to-video',
] as const;
const AI_IMAGE_GENERATOR_MODES = ['text-to-image', 'image-to-image'] as const;

function readJson(relativePath: string) {
  return JSON.parse(readFileSync(join(process.cwd(), relativePath), 'utf8'));
}

function getNestedValue(input: Record<string, any>, dottedPath: string) {
  return dottedPath
    .split('.')
    .reduce<any>((result, key) => result?.[key], input);
}

function getTitleMax(locale: string) {
  return ['zh', 'ja', 'ko'].includes(locale)
    ? OTHER_TITLE_MAX
    : LATIN_TITLE_MAX;
}

function isEnglishIndexableEntry(source: string) {
  if (!source.startsWith('en:')) {
    return false;
  }

  return (
    !source.startsWith('en:ai-image-generator.text-to-image') &&
    !source.startsWith('en:ai-image-generator.image-to-image')
  );
}

function getPageFrontmatter(locale: string, slug: string) {
  const localizedFile =
    locale === 'en' ? `${slug}.mdx` : `${slug}.${locale}.mdx`;
  const pagesDir = join(process.cwd(), 'content/pages');
  const localizedPath = join(pagesDir, localizedFile);
  const fallbackPath = join(pagesDir, `${slug}.mdx`);
  const source = readFileSync(
    existsSync(localizedPath) ? localizedPath : fallbackPath,
    'utf8'
  );

  return parseContentFrontmatter(source);
}

function collectLocaleEntries(locale: string): MetadataEntry[] {
  const landingMessages = readJson(
    `src/config/locale/messages/${locale}/landing.json`
  );
  const pricingMessages = readJson(
    `src/config/locale/messages/${locale}/pricing.json`
  );
  const entries: MetadataEntry[] = [
    {
      source: `${locale}:landing.metadata`,
      title: landingMessages.metadata.title,
      description: landingMessages.metadata.description,
    },
    {
      source: `${locale}:pricing.metadata`,
      title: pricingMessages.metadata.title,
      description: pricingMessages.metadata.description,
    },
    {
      source: `${locale}:ai-video-generator.root`,
      title: getGeneratorRootSeoCopy(locale).metadataTitle,
      description: getGeneratorRootSeoCopy(locale).description,
    },
    {
      source: `${locale}:ai-image-generator.root`,
      title: getImageGeneratorRootSeoCopy(locale).metadataTitle,
      description: getImageGeneratorRootSeoCopy(locale).description,
    },
  ];

  for (const metadataKey of TOOL_METADATA_KEYS) {
    const metadata = getNestedValue(landingMessages, metadataKey);

    entries.push({
      source: `${locale}:landing.${metadataKey}`,
      title: metadata.title,
      description: metadata.description,
    });
  }

  for (const mode of AI_GENERATOR_MODES) {
    const metadata = getGeneratorModeSeoCopy(locale, mode);

    entries.push({
      source: `${locale}:ai-video-generator.${mode}`,
      title: metadata.metadataTitle,
      description: metadata.description,
    });
  }

  for (const mode of AI_IMAGE_GENERATOR_MODES) {
    const metadata = getImageGeneratorModeSeoCopy(locale, mode);

    entries.push({
      source: `${locale}:ai-image-generator.${mode}`,
      title: metadata.metadataTitle,
      description: metadata.description,
    });
  }

  for (const slug of PUBLIC_POLICY_SLUGS) {
    const frontmatter = getPageFrontmatter(locale, slug);

    entries.push({
      source: `${locale}:content.${slug}`,
      title: frontmatter.seo_title || frontmatter.title || '',
      description: frontmatter.description || '',
    });
  }

  return entries;
}

describe('public metadata copy', () => {
  it('keeps public page metadata concise and free of markdown noise', () => {
    for (const locale of publicSiteLocales) {
      const entries = collectLocaleEntries(locale);

      for (const entry of entries) {
        const title = replaceBrandTokens(entry.title);
        const description = replaceBrandTokens(entry.description);

        expect(title, `${entry.source}:title`).not.toContain('`');
        expect(description, `${entry.source}:description`).not.toContain('`');
        expect(
          title.length,
          `${entry.source}:title-length`
        ).toBeLessThanOrEqual(getTitleMax(locale));
        expect(
          description.length,
          `${entry.source}:description-length`
        ).toBeLessThanOrEqual(DESCRIPTION_MAX);

        if (isEnglishIndexableEntry(entry.source)) {
          expect(
            title.length,
            `${entry.source}:strict-title-min`
          ).toBeGreaterThanOrEqual(EN_INDEXABLE_TITLE_MIN);
          expect(
            title.length,
            `${entry.source}:strict-title-max`
          ).toBeLessThanOrEqual(EN_INDEXABLE_TITLE_MAX);
          expect(
            description.length,
            `${entry.source}:strict-description-min`
          ).toBeGreaterThanOrEqual(EN_DESCRIPTION_MIN);
          expect(
            description.length,
            `${entry.source}:strict-description-max`
          ).toBeLessThanOrEqual(EN_DESCRIPTION_MAX);
        }
      }
    }
  });
});
