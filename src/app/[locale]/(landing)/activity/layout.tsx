import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { ConsoleLayout } from '@/shared/blocks/console/layout';
import { NotificationBellButton } from '@/shared/blocks/notifications/notification-bell-button';
import { replaceBrandTokens, replaceBrandTokensDeep } from '@/shared/lib/brand';
import { Nav } from '@/shared/types/blocks/common';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ActivityLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('activity.sidebar');

  // settings title
  const title = replaceBrandTokens(t('title'));

  // settings nav
  const nav = replaceBrandTokensDeep(t.raw('nav')) as Nav;

  const rawTopNav = replaceBrandTokensDeep(t.raw('top_nav')) as Nav | undefined;
  const topNav = rawTopNav
    ? {
        ...rawTopNav,
        items: rawTopNav.items || [],
      }
    : undefined;

  return (
    <ConsoleLayout
      title={title}
      nav={nav}
      topNav={topNav}
      headerActions={<NotificationBellButton />}
      className="py-16 md:py-20"
    >
      {children}
    </ConsoleLayout>
  );
}
