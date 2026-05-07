import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requireAdminPermission } from '@/core/rbac';
import { PaymentType } from '@/extensions/payment/types';
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
import { getOrders, getOrdersCount, OrderStatus } from '@/shared/models/order';
import { Crumb, Filter, Search, Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RouteSearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user has permission to read payments
  await requireAdminPermission(PERMISSIONS.PAYMENTS_READ, locale);

  const t = await getTranslations('admin.payments');

  const resolvedSearchParams = await searchParams;
  const { page, limit } = parseAdminPagination(resolvedSearchParams);
  const type = getRouteSearchParam(resolvedSearchParams.type);
  const status = getRouteSearchParam(resolvedSearchParams.status);
  const provider = getRouteSearchParam(resolvedSearchParams.provider);
  const email = getRouteSearchParam(resolvedSearchParams.email);

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: ADMIN_ROUTES.ROOT },
    { title: t('list.crumbs.payments'), is_active: true },
  ];

  const tabs: Tab[] = [
    {
      name: 'all',
      title: t('list.tabs.all'),
      url: ADMIN_ROUTES.PAYMENTS,
      is_active: !type || type === 'all',
    },
    {
      name: 'subscription',
      title: t('list.tabs.subscription'),
      url: buildAdminHref(ADMIN_ROUTES.PAYMENTS, { type: 'subscription' }),
      is_active: type === 'subscription',
    },
    {
      name: 'one-time',
      title: t('list.tabs.one-time'),
      url: buildAdminHref(ADMIN_ROUTES.PAYMENTS, { type: 'one-time' }),
      is_active: type === 'one-time',
    },
  ];

  const filters: Filter[] = [
    {
      name: 'status',
      title: t('list.filters.status.title'),
      value: status,
      options: [
        { value: 'all', label: t('list.filters.status.options.all') },
        {
          value: OrderStatus.PAID,
          label: t('list.filters.status.options.paid'),
        },
        {
          value: OrderStatus.CREATED,
          label: t('list.filters.status.options.created'),
        },
        {
          value: OrderStatus.FAILED,
          label: t('list.filters.status.options.failed'),
        },
      ],
    },
    {
      name: 'provider',
      title: t('list.filters.provider.title'),
      value: provider,
      options: [
        { value: 'all', label: t('list.filters.provider.options.all') },
        {
          value: 'stripe',
          label: t('list.filters.provider.options.stripe'),
        },
        {
          value: 'creem',
          label: t('list.filters.provider.options.creem'),
        },
        {
          value: 'paypal',
          label: t('list.filters.provider.options.paypal'),
        },
      ],
    },
  ];

  const search: Search = {
    name: 'email',
    title: t('list.search.email.title'),
    placeholder: t('list.search.email.placeholder'),
    value: email,
  };

  const total = await getOrdersCount({
    userEmail: email ? (email as string) : undefined,
    paymentType: type as PaymentType,
    paymentProvider:
      provider && provider !== 'all' ? (provider as string) : undefined,
    status: status && status !== 'all' ? (status as OrderStatus) : undefined,
  });

  const payments = await getOrders({
    userEmail: email ? (email as string) : undefined,
    paymentType: type as PaymentType,
    paymentProvider:
      provider && provider !== 'all' ? (provider as string) : undefined,
    status: status && status !== 'all' ? (status as OrderStatus) : undefined,
    getUser: true,
    page,
    limit,
  });

  const table: Table = {
    columns: [
      { name: 'orderNo', title: t('fields.order_no'), type: 'copy' },
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
      { name: 'status', title: t('fields.status'), type: 'label' },
      {
        name: 'paymentType',
        title: t('fields.type'),
        type: 'label',
        placeholder: '-',
      },
      {
        name: 'productId',
        title: t('fields.product'),
        type: 'label',
        placeholder: '-',
      },
      { name: 'description', title: t('fields.description'), placeholder: '-' },
      {
        name: 'paymentProvider',
        title: t('fields.provider'),
        type: 'label',
      },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
    ],
    data: payments,
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
        <MainHeader
          title={t('list.title')}
          tabs={tabs}
          filters={filters}
          search={search}
        />
        <TableCard table={table} />
      </Main>
    </>
  );
}
