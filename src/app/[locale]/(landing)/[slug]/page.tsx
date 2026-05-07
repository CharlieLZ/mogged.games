import { setRequestLocale } from 'next-intl/server';

import {
  buildPublicContentMetadata,
  renderPublicContentPage,
} from '@/shared/lib/public-content-page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return buildPublicContentMetadata({
    locale,
    contentSlug: slug,
    publicPath: `/${slug}`,
  });
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return renderPublicContentPage({
    locale,
    contentSlug: slug,
    publicPath: `/${slug}`,
  });
}
