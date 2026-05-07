import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { getAdminWeeklyPageData } from '@/shared/services/admin-dashboard';

import { RefreshButton } from '../refresh-button';
import { WeeklyStatsTable } from './_components/weekly-stats-table';

export const dynamic = 'force-dynamic';

export default async function AdminWeeklyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.weekly');
  const { weeklyStats } = await getAdminWeeklyPageData(12);

  return (
    <>
      <Header
        title={t('title')}
        crumbs={[
          {
            title: t('crumbs.admin'),
            url: '/admin',
          },
          {
            title: t('crumbs.weekly'),
            is_active: true,
          },
        ]}
      />
      <Main>
        <MainHeader title={t('title')} description={t('description')}>
          <RefreshButton title={t('refresh')} />
        </MainHeader>
        <WeeklyStatsTable stats={weeklyStats} />
      </Main>
    </>
  );
}
