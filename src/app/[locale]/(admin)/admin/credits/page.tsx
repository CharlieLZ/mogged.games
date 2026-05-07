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
import {
  CreditStatus,
  CreditTransactionType,
  getCredits,
  getCreditsCount,
} from '@/shared/models/credit';
import { Crumb, Search, Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function CreditsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RouteSearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user has permission to read credits
  await requireAdminPermission(PERMISSIONS.CREDITS_READ, locale);

  const t = await getTranslations('admin.credits');

  const resolvedSearchParams = await searchParams;
  const { page, limit } = parseAdminPagination(resolvedSearchParams);
  const type = getRouteSearchParam(resolvedSearchParams.type);
  const email = getRouteSearchParam(resolvedSearchParams.email);

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: ADMIN_ROUTES.ROOT },
    { title: t('list.crumbs.credits'), is_active: true },
  ];

  const tabs: Tab[] = [
    {
      name: 'all',
      title: t('list.tabs.all'),
      url: ADMIN_ROUTES.CREDITS,
      is_active: !type || type === 'all',
    },
    {
      name: 'grant',
      title: t('list.tabs.grant'),
      url: buildAdminHref(ADMIN_ROUTES.CREDITS, { type: 'grant' }),
      is_active: type === 'grant',
    },
    {
      name: 'consume',
      title: t('list.tabs.consume'),
      url: buildAdminHref(ADMIN_ROUTES.CREDITS, { type: 'consume' }),
      is_active: type === 'consume',
    },
    {
      name: 'paid',
      title: t('list.tabs.paid'),
      url: buildAdminHref(ADMIN_ROUTES.CREDITS, { type: 'paid' }),
      is_active: type === 'paid',
    },
  ];

  // 判断是否筛选付费积分
  const isPaid = type === 'paid';
  // 只有 grant 和 consume 时才传 transactionType
  const transactionType =
    type === 'grant' || type === 'consume'
      ? (type as CreditTransactionType)
      : undefined;

  const total = await getCreditsCount({
    transactionType,
    isPaid,
    status: CreditStatus.ACTIVE,
    userEmail: email,
  });

  const credits = await getCredits({
    transactionType,
    isPaid,
    status: CreditStatus.ACTIVE,
    getUser: true,
    page,
    limit,
    userEmail: email,
  });

  const search: Search = {
    name: 'email',
    title: t('list.search.email.title'),
    placeholder: t('list.search.email.placeholder'),
    value: email,
  };

  const table: Table = {
    columns: [
      {
        name: 'transactionNo',
        title: t('fields.transaction_no'),
        type: 'copy',
      },
      { name: 'user', title: t('fields.user'), type: 'user' },
      {
        name: 'credits',
        title: t('fields.amount'),
        callback: (item) => {
          if (item.credits > 0) {
            return <div className="text-[var(--success)]">+{item.credits}</div>;
          } else {
            return <div className="text-destructive">{item.credits}</div>;
          }
        },
      },
      {
        name: 'remainingCredits',
        title: t('fields.remaining'),
        type: 'label',
        placeholder: '-',
      },
      { name: 'transactionType', title: t('fields.type') },
      { name: 'transactionScene', title: t('fields.scene'), placeholder: '-' },
      { name: 'description', title: t('fields.description'), placeholder: '-' },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      {
        name: 'expiresAt',
        title: t('fields.expires_at'),
        type: 'time',
        placeholder: '-',
        metadata: { format: 'YYYY-MM-DD HH:mm:ss' },
      },
      {
        name: 'metadata',
        title: t('fields.metadata'),
        type: 'json_preview',
        placeholder: '-',
      },
    ],
    data: credits,
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
        <MainHeader title={t('list.title')} tabs={tabs} search={search} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
