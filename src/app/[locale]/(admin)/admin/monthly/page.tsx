import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { getAdminMonthlyPageData } from '@/shared/services/admin-dashboard';

import { AcquisitionBreakdownTable } from '../_components/acquisition-breakdown-table';
import { FunnelStatsTable } from '../_components/funnel-stats-table';
import { RefreshButton } from '../refresh-button';
import { MonthlyStatsTable } from './_components/monthly-stats-table';

export const dynamic = 'force-dynamic';

export default async function AdminMonthlyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.monthly');
  const { monthlyStats, funnelStats, acquisitionBreakdowns } =
    await getAdminMonthlyPageData(12);
  const breakdownTableLabels = {
    signupsLabel: t('funnel.table.signups'),
    firstSuccessesLabel: t('funnel.table.first_successful_generations'),
    checkoutStartsLabel: t('funnel.table.checkout_starts'),
    paidUsersLabel: t('funnel.table.paid_users'),
  };

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
            title: t('crumbs.monthly'),
            is_active: true,
          },
        ]}
      />
      <Main>
        <MainHeader title={t('title')} description={t('description')}>
          <RefreshButton title={t('refresh')} />
        </MainHeader>
        <div className="space-y-6">
          <MonthlyStatsTable stats={monthlyStats} />

          <Card>
            <CardHeader>
              <CardTitle>{t('funnel.title')}</CardTitle>
              <CardDescription>{t('funnel.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <FunnelStatsTable
                periodLabel="month"
                stats={funnelStats}
                translationNamespace="admin.monthly"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('acquisition.title')}</CardTitle>
              <CardDescription>{t('acquisition.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('acquisition.cards.campaign')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AcquisitionBreakdownTable
                    valueLabel={t('acquisition.value_labels.campaign')}
                    signupToPaidLabel={t('acquisition.table.signup_to_paid')}
                    emptyText={t('acquisition.empty')}
                    missingValueText={t('acquisition.unattributed')}
                    stats={acquisitionBreakdowns.campaign}
                    {...breakdownTableLabels}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('acquisition.cards.adgroup')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AcquisitionBreakdownTable
                    valueLabel={t('acquisition.value_labels.adgroup')}
                    signupToPaidLabel={t('acquisition.table.signup_to_paid')}
                    emptyText={t('acquisition.empty')}
                    missingValueText={t('acquisition.unattributed')}
                    stats={acquisitionBreakdowns.adgroup}
                    {...breakdownTableLabels}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('acquisition.cards.workflow')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AcquisitionBreakdownTable
                    valueLabel={t('acquisition.value_labels.workflow')}
                    signupToPaidLabel={t('acquisition.table.signup_to_paid')}
                    emptyText={t('acquisition.empty')}
                    missingValueText={t('acquisition.unattributed')}
                    stats={acquisitionBreakdowns.workflow}
                    {...breakdownTableLabels}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('acquisition.cards.match')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AcquisitionBreakdownTable
                    valueLabel={t('acquisition.value_labels.match')}
                    signupToPaidLabel={t('acquisition.table.signup_to_paid')}
                    emptyText={t('acquisition.empty')}
                    missingValueText={t('acquisition.unattributed')}
                    stats={acquisitionBreakdowns.match}
                    {...breakdownTableLabels}
                  />
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('tuning.title')}</CardTitle>
              <CardDescription>{t('tuning.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>{t('tuning.cards.country')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AcquisitionBreakdownTable
                    valueLabel={t('tuning.value_labels.country')}
                    signupToPaidLabel={t('tuning.table.signup_to_paid')}
                    emptyText={t('tuning.empty')}
                    missingValueText={t('tuning.unknown')}
                    stats={acquisitionBreakdowns.country}
                    {...breakdownTableLabels}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('tuning.cards.language')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AcquisitionBreakdownTable
                    valueLabel={t('tuning.value_labels.language')}
                    signupToPaidLabel={t('tuning.table.signup_to_paid')}
                    emptyText={t('tuning.empty')}
                    missingValueText={t('tuning.unknown')}
                    stats={acquisitionBreakdowns.language}
                    {...breakdownTableLabels}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('tuning.cards.device')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AcquisitionBreakdownTable
                    valueLabel={t('tuning.value_labels.device')}
                    signupToPaidLabel={t('tuning.table.signup_to_paid')}
                    emptyText={t('tuning.empty')}
                    missingValueText={t('tuning.unknown')}
                    stats={acquisitionBreakdowns.device}
                    {...breakdownTableLabels}
                  />
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
