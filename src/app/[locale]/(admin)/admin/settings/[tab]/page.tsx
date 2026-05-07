import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { ADMIN_ROUTES, buildAdminHref } from '@/shared/lib/admin-routes';

export default async function SettingsTabRedirect({
  params,
}: {
  params: Promise<{ locale: string; tab: string }>;
}) {
  const { locale, tab } = await params;
  setRequestLocale(locale);

  redirect(buildAdminHref(ADMIN_ROUTES.SETTINGS, { tab: tab || 'general' }));
}
