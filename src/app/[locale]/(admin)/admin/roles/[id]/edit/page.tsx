import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requireAdminPermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common/empty';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { ADMIN_ROUTES } from '@/shared/lib/admin-routes';
import { getRoleById, updateRole, UpdateRole } from '@/shared/services/rbac';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function RoleEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  await requireAdminPermission(PERMISSIONS.ROLES_WRITE, locale);

  const role = await getRoleById(id as string);
  if (!role) {
    return <Empty message="Role not found" />;
  }

  const t = await getTranslations('admin.roles');

  const crumbs: Crumb[] = [
    { title: t('edit.crumbs.admin'), url: ADMIN_ROUTES.ROOT },
    { title: t('edit.crumbs.roles'), url: ADMIN_ROUTES.ROLES },
    { title: t('edit.crumbs.edit'), is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'name',
        type: 'text',
        title: t('fields.name'),
        validation: { required: true },
        attributes: { disabled: true },
      },
      {
        name: 'title',
        type: 'text',
        title: t('fields.title'),
        validation: { required: true },
      },
      {
        name: 'description',
        type: 'textarea',
        title: t('fields.description'),
        validation: { required: true },
      },
    ],
    passby: {
      role: role,
    },
    data: role,
    submit: {
      button: {
        title: t('edit.buttons.submit'),
      },
      handler: async (data, passby) => {
        'use server';

        const { role } = passby;

        if (!role) {
          throw new Error('no auth');
        }

        const title = data.get('title') as string;
        const description = data.get('description') as string;

        const newRole: UpdateRole = {
          title: title.trim(),
          description: description as string,
        };

        const result = await updateRole(role.id as string, newRole);

        if (!result) {
          throw new Error('update role failed');
        }

        return {
          status: 'success',
          message: 'role updated',
          redirect_url: ADMIN_ROUTES.ROLES,
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('edit.title')} />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
