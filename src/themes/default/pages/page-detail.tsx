import { ContentPage } from '@/shared/types/content';
import { PageDetail } from '@/themes/default/blocks/page-detail';

export default async function PageDetailPage({
  locale: _locale,
  page,
}: {
  locale?: string;
  page: ContentPage;
}) {
  return <PageDetail page={page} />;
}
