import { getMDXComponents } from '@/mdx-components';
import { createRelativeLink } from 'fumadocs-ui/mdx';

import { pagesSource } from '@/core/docs/source';
import { getLocaleBcp47, resolveAppLocale } from '@/config/locale';
import { getContentFrontmatter } from '@/shared/lib/content-frontmatter';
import { getDayjs } from '@/shared/lib/dayjs';
import type { ContentPage } from '@/shared/types/content';

export async function getLocalPage({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<ContentPage | null> {
  let localPage = await pagesSource.getPage([slug], locale);

  if (!localPage && locale !== 'en') {
    localPage = await pagesSource.getPage([slug], 'en');
  }

  if (!localPage) {
    return null;
  }

  const frontmatter = await getContentFrontmatter({ slug, locale });
  const MDXContent = localPage.data.body;
  const body = (
    <MDXContent
      components={getMDXComponents({
        a: createRelativeLink(pagesSource, localPage),
      }, { locale })}
    />
  );

  const sourceData = localPage.data as any;
  const createdAtRaw = frontmatter.created_at
    ? String(frontmatter.created_at)
    : sourceData.created_at
      ? String(sourceData.created_at)
      : '';
  const updatedAtRaw = frontmatter.updated_at
    ? String(frontmatter.updated_at)
    : sourceData.updated_at
      ? String(sourceData.updated_at)
      : createdAtRaw;

  return {
    id: localPage.path,
    slug,
    title: localPage.data.title || frontmatter.title || '',
    seo_title: frontmatter.seo_title || sourceData.seo_title || '',
    description: localPage.data.description || frontmatter.description || '',
    keywords: normalizeContentKeywords(frontmatter.keywords),
    image: frontmatter.image || sourceData.image || '',
    content: '',
    body,
    toc: localPage.data.toc,
    created_at: createdAtRaw
      ? formatContentDate({
          created_at: createdAtRaw,
          locale,
        })
      : '',
    created_at_iso: toContentDateIso(createdAtRaw),
    updated_at: updatedAtRaw
      ? formatContentDate({
          created_at: updatedAtRaw,
          locale,
        })
      : '',
    updated_at_iso: toContentDateIso(updatedAtRaw),
    author_name: frontmatter.author_name || sourceData.author_name || '',
    author_image: frontmatter.author_image || sourceData.author_image || '',
    author_role: '',
    url: locale === 'en' ? `/${slug}` : `/${locale}/${slug}`,
  };
}

function formatContentDate({
  created_at,
  locale,
}: {
  created_at: string;
  locale?: string;
}) {
  const normalizedLocale = resolveAppLocale(locale);
  const parsed = getDayjs(created_at, normalizedLocale);

  if (!parsed.isValid()) {
    return created_at;
  }

  return new Intl.DateTimeFormat(getLocaleBcp47(normalizedLocale), {
    year: 'numeric',
    month: normalizedLocale === 'zh' ? 'numeric' : 'short',
    day: 'numeric',
  }).format(parsed.toDate());
}

function toContentDateIso(value?: string) {
  if (!value) {
    return '';
  }

  const parsed = getDayjs(value);
  return parsed.isValid() ? parsed.toISOString() : '';
}

function normalizeContentKeywords(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}
