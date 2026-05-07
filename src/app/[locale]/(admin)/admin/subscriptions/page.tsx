import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requireAdminPermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  ADMIN_ROUTES,
  buildAdminHref,
  getRouteSearchParam,
  parseAdminPagination,
  type RouteSearchParams,
} from '@/shared/lib/admin-routes';
import { formatPricingMoney } from '@/shared/lib/pricing';
import {
  getSubscriptions,
  getSubscriptionsCount,
} from '@/shared/models/subscription';
import { Crumb, Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function SubscriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RouteSearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user has permission to read subscriptions
  await requireAdminPermission(PERMISSIONS.SUBSCRIPTIONS_READ, locale);

  const t = await getTranslations('admin.subscriptions');

  const resolvedSearchParams = await searchParams;
  const { page, limit } = parseAdminPagination(resolvedSearchParams);
  const interval = getRouteSearchParam(resolvedSearchParams.interval);

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: ADMIN_ROUTES.ROOT },
    { title: t('list.crumbs.subscriptions'), is_active: true },
  ];

  const tabs: Tab[] = [
    {
      name: 'all',
      title: t('list.tabs.all'),
      url: ADMIN_ROUTES.SUBSCRIPTIONS,
      is_active: !interval || interval === 'all',
    },
    {
      name: 'month',
      title: t('list.tabs.month'),
      url: buildAdminHref(ADMIN_ROUTES.SUBSCRIPTIONS, { interval: 'month' }),
      is_active: interval === 'month',
    },
    {
      name: 'year',
      title: t('list.tabs.year'),
      url: buildAdminHref(ADMIN_ROUTES.SUBSCRIPTIONS, { interval: 'year' }),
      is_active: interval === 'year',
    },
  ];

  const total = await getSubscriptionsCount({
    interval,
  });

  const subscriptions = await getSubscriptions({
    interval,
    getUser: true,
    page,
    limit,
  });

  const table: Table = {
    columns: [
      {
        name: 'subscriptionNo',
        title: t('fields.subscription_no'),
        type: 'copy',
      },
      { name: 'user', title: t('fields.user'), type: 'user' },
      {
        title: t('fields.amount'),
        callback: (item) => {
          return (
            <div className="text-primary">
              {formatPricingMoney({
                amount: item.amount,
                currency: item.currency,
                locale,
                fallback: '-',
              })}
            </div>
          );
        },
        type: 'copy',
      },
      {
        name: 'interval',
        title: t('fields.interval'),
        type: 'label',
        placeholder: '-',
      },
      {
        name: 'paymentProvider',
        title: t('fields.provider'),
        type: 'label',
      },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      {
        name: 'currentPeriodStart',
        title: t('fields.current_period_start'),
        type: 'time',
        metadata: { format: 'YYYY-MM-DD HH:mm:ss' },
      },
      {
        name: 'currentPeriodEnd',
        title: t('fields.current_period_end'),
        type: 'time',
        metadata: { format: 'YYYY-MM-DD HH:mm:ss' },
      },
      { name: 'status', title: t('fields.status'), type: 'label' },
      { name: 'description', title: t('fields.description'), placeholder: '-' },
    ],
    data: subscriptions,
    pagination: {
      total,
      page,
      limit,
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} tabs={tabs} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
