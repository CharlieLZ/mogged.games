import { renderFreeToolsIndexPage } from '@/shared/lib/free-tools-pages';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  metadataKey: 'landing.free_tools.index.metadata',
  canonicalUrl: '/free-tools',
});

export default async function FreeToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return renderFreeToolsIndexPage(locale);
}
