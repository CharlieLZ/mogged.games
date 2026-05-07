import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { ConsoleLayout } from '@/shared/blocks/console/layout';
import { NotificationBellButton } from '@/shared/blocks/notifications/notification-bell-button';
import {
  getSupportEmail,
  replaceBrandTokens,
  replaceBrandTokensDeep,
} from '@/shared/lib/brand';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('settings.sidebar');

  // settings title
  const title = replaceBrandTokens(t('title'));

  // settings nav
  const nav = replaceBrandTokensDeep(t.raw('nav'));

  const topNav = replaceBrandTokensDeep(t.raw('top_nav'));

  // support contact
  const supportText = replaceBrandTokens(t('support_text'));
  const supportEmail = getSupportEmail();

  return (
    <ConsoleLayout
      title={title}
      nav={nav}
      topNav={topNav}
      headerActions={<NotificationBellButton />}
      supportText={supportText}
      supportEmail={supportEmail}
      className="py-16 md:py-20"
    >
      {children}
    </ConsoleLayout>
  );
}
