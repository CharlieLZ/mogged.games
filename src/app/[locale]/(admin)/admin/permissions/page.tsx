import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requireAdminPermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import { ADMIN_ROUTES } from '@/shared/lib/admin-routes';
import { getPermissions } from '@/shared/services/rbac';
import { Crumb } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function AdminPermissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireAdminPermission(PERMISSIONS.PERMISSIONS_READ, locale);

  const permissions = await getPermissions();

  const t = await getTranslations('admin.permissions');

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: ADMIN_ROUTES.ROOT },
    { title: t('list.crumbs.permissions'), is_active: true },
  ];

  const table: Table = {
    columns: [
      { name: 'code', title: t('fields.code') },
      { name: 'title', title: t('fields.title') },
      { name: 'resource', title: t('fields.resource') },
      { name: 'action', title: t('fields.action') },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
    ],
    data: permissions,
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
