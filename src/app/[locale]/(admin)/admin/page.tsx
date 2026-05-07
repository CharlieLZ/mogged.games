import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader, StatCard } from '@/shared/blocks/dashboard';
import { ADMIN_ROUTES, buildAdminHref } from '@/shared/lib/admin-routes';
import { getAdminOverviewPageData } from '@/shared/services/admin-dashboard';

import { RefreshButton } from './refresh-button';

export const dynamic = 'force-dynamic';

const cardLinks = {
  users: ADMIN_ROUTES.USERS,
  payments: ADMIN_ROUTES.PAYMENTS,
  subscriptions: ADMIN_ROUTES.SUBSCRIPTIONS,
  credits: ADMIN_ROUTES.CREDITS,
  guestCredits: ADMIN_ROUTES.AI_TASKS,
};

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Note: Permission check already done in layout (requireAdminAccess)

  const t = await getTranslations('admin.dashboard');
  const { stats, recent } = await getAdminOverviewPageData();

  const formatMoney = (value: number) =>
    t('unit.money', { value: (value || 0) / 100 });
  const formatCredits = (value: number) => t('unit.credits', { value });
  const formatUsers = (value: number) => t('unit.users', { value });
  const formatMoneyPlain = (value?: number, currency?: string) =>
    `${(value || 0) / 100}${currency ? ` ${currency}` : ''}`;
  const formatTime = (value?: Date | string | null) =>
    value ? new Date(value).toLocaleString() : '';

  return (
    <>
      <Header
        title={t('title')}
        crumbs={[
          {
            title: t('crumbs.admin'),
            url: ADMIN_ROUTES.ROOT,
          },
          {
            title: t('crumbs.dashboard'),
            is_active: true,
          },
        ]}
      />
      <Main>
        <MainHeader title={t('title')} description={t('description')}>
          <RefreshButton title={t('refresh')} />
        </MainHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          <StatCard
            title={t('cards.users')}
            value7={formatUsers(stats.users.last7Days)}
            value30={formatUsers(stats.users.last30Days)}
            href={cardLinks.users}
            moreLabel={t('more')}
            items={recent.users.map((user) => ({
              title: user.name || user.email || '-',
              subtitle: user.email,
              time: formatTime(user.createdAt),
            }))}
          />
          <StatCard
            title={t('cards.payments')}
            value7={formatMoney(stats.payments.last7Days)}
            value30={formatMoney(stats.payments.last30Days)}
            href={cardLinks.payments}
            moreLabel={t('more')}
            items={recent.ordersPaid.map((item) => ({
              title: formatMoneyPlain(item.amount, item.currency),
              subtitle: item.description || item.orderNo,
              time: formatTime(item.createdAt),
            }))}
          />
          <StatCard
            title={t('cards.subscriptions')}
            value7={formatMoney(stats.subscriptions.last7Days)}
            value30={formatMoney(stats.subscriptions.last30Days)}
            href={cardLinks.subscriptions}
            moreLabel={t('more')}
            items={recent.subscriptionsPaid.map((item) => ({
              title: formatMoneyPlain(item.amount, item.currency),
              subtitle: item.description || item.orderNo,
              time: formatTime(item.createdAt),
            }))}
          />
          <StatCard
            title={t('cards.credits')}
            value7={formatCredits(stats.credits.last7Days)}
            value30={formatCredits(stats.credits.last30Days)}
            href={buildAdminHref(ADMIN_ROUTES.CREDITS, { type: 'consume' })}
            moreLabel={t('more')}
            items={recent.creditConsumes.map((item) => ({
              title: `${item.credits} credits`,
              subtitle: item.description || item.transactionScene || '',
              time: formatTime(item.createdAt),
            }))}
          />
          <StatCard
            title={t('cards.guest_credits')}
            value7={formatCredits(stats.guestCreditsConsumed.last7Days)}
            value30={formatCredits(stats.guestCreditsConsumed.last30Days)}
            href={cardLinks.guestCredits}
            moreLabel={t('more')}
            items={recent.guestCreditsConsumed.map((item) => ({
              title: formatCredits(item.quotaUnits),
              subtitle:
                [item.scene, item.providerTaskId || item.provider]
                  .filter(Boolean)
                  .join(' · ') || '-',
              time: formatTime(item.createdAt),
            }))}
          />
          <StatCard
            title={t('cards.credits_granted')}
            value7={formatCredits(stats.creditsGranted.last7Days)}
            value30={formatCredits(stats.creditsGranted.last30Days)}
            href={ADMIN_ROUTES.CREDITS}
            moreLabel={t('more')}
            items={recent.creditsGranted.map((item) => ({
              title: `${item.credits} credits`,
              subtitle: item.description || item.transactionScene || '',
              time: formatTime(item.createdAt),
            }))}
          />
        </div>
      </Main>
    </>
  );
}
