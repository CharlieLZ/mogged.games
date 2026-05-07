import { getMetadata } from '@/shared/lib/seo';
import {
  FREE_TOOL_SLUGS,
  getFreeToolBySlug,
} from '@/shared/lib/free-tools-catalog';
import { renderFreeToolPage } from '@/shared/lib/free-tools-pages';

export function generateStaticParams() {
  return FREE_TOOL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const tool = getFreeToolBySlug(slug);

  if (!tool) {
    return {};
  }

  return getMetadata({
    metadataKey: tool.metadataKey,
    canonicalUrl: tool.path,
  })({
    params: Promise.resolve({ locale }),
  });
}

export default async function FreeToolDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  return renderFreeToolPage({ locale, slug });
}
