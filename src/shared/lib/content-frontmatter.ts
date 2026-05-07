import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface ContentFrontmatter {
  title?: string;
  seo_title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
  author_name?: string;
  author_image?: string;
}

const frontmatterCache = new Map<string, Promise<ContentFrontmatter>>();

export async function getContentFrontmatter({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<ContentFrontmatter> {
  const cacheKey = `${locale}:${slug}`;
  const cached = frontmatterCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const pending = loadContentFrontmatter({ slug, locale });
  frontmatterCache.set(cacheKey, pending);

  return pending;
}

export function parseContentFrontmatter(source: string): ContentFrontmatter {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!match) {
    return {};
  }

  const parsed: ContentFrontmatter = {};

  for (const line of match[1].split(/\r?\n/)) {
    const entry = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);

    if (!entry) {
      continue;
    }

    const [, key, rawValue] = entry;
    const value = normalizeFrontmatterValue(rawValue);

    switch (key) {
      case 'title':
      case 'seo_title':
      case 'description':
      case 'keywords':
      case 'image':
      case 'created_at':
      case 'updated_at':
      case 'author_name':
      case 'author_image':
        parsed[key] = value;
        break;
      default:
        break;
    }
  }

  return parsed;
}

async function loadContentFrontmatter({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<ContentFrontmatter> {
  for (const candidatePath of buildCandidatePaths({ slug, locale })) {
    try {
      const source = await readFile(candidatePath, 'utf8');
      return parseContentFrontmatter(source);
    } catch (error) {
      if (isMissingFileError(error)) {
        continue;
      }

      throw error;
    }
  }

  return {};
}

function buildCandidatePaths({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  const pagesDir = path.join(process.cwd(), 'content/pages');

  if (!locale || locale === 'en') {
    return [path.join(pagesDir, `${slug}.mdx`)];
  }

  return [
    path.join(pagesDir, `${slug}.${locale}.mdx`),
    path.join(pagesDir, `${slug}.mdx`),
  ];
}

function normalizeFrontmatterValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function isMissingFileError(error: unknown) {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  );
}
