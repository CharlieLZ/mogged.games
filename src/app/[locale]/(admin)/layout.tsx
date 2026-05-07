import { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { requireAdminArea } from '@/core/rbac';
import { LocaleDetector } from '@/shared/blocks/common/locale-detector';
import { DashboardLayout, DashboardTopNav } from '@/shared/blocks/dashboard';
import {
  getRepositoryUrl,
  getSupportMailto,
  replaceBrandTokensDeep,
} from '@/shared/lib/brand';
import { resolveAdminSidebar } from '@/shared/lib/admin-routes';
import { Sidebar as SidebarType } from '@/shared/types/blocks/dashboard';
import { Header as HeaderType } from '@/shared/types/blocks/landing';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Admin layout to manage datas
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user has admin access permission
  await requireAdminArea(locale || '');

  const [adminTranslations, landingTranslations] = await Promise.all([
    getTranslations('admin'),
    getTranslations('landing'),
  ]);

  const sidebar = replaceBrandTokensDeep(
    adminTranslations.raw('sidebar')
  ) as SidebarType;
  const header = replaceBrandTokensDeep(
    landingTranslations.raw('header')
  ) as HeaderType;

  const resolvedSidebar = resolveAdminSidebar(sidebar, {
    repositoryUrl: getRepositoryUrl(),
    supportMailto: getSupportMailto(),
  });

  return (
    <>
      <DashboardTopNav header={header} />
      <DashboardLayout sidebar={resolvedSidebar}>
        <LocaleDetector />
        {children}
      </DashboardLayout>
    </>
  );
}
