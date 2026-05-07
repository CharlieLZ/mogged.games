import { getTranslations } from 'next-intl/server';

import { Empty } from '@/shared/blocks/common/empty';
import {
  ChangePasswordCard,
  DangerZone,
  RequestPasswordResetCard,
} from '@/shared/blocks/settings';
import { deleteUser } from '@/shared/models/user';
import { getUserInfo } from '@/shared/services/current-user';

export default async function SecurityPage() {
  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('settings.security');
  const profileT = await getTranslations('settings.profile');
  const unauthenticatedMessage = profileT('edit.messages.unauthenticated');
  const deleteErrorMessage = t('danger_zone.deleteError');

  async function deleteAccountAction(): Promise<{
    success: boolean;
    error?: string;
  }> {
    'use server';

    const currentUser = await getUserInfo();
    if (!currentUser) {
      return { success: false, error: unauthenticatedMessage };
    }

    try {
      await deleteUser(currentUser.id);
      return { success: true };
    } catch (error) {
      console.error('[settings/security] failed to delete user', error);
      return { success: false, error: deleteErrorMessage };
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </div>
      <ChangePasswordCard />
      <RequestPasswordResetCard defaultEmail={user.email} />
      <DangerZone deleteAccountAction={deleteAccountAction} />
    </div>
  );
}
