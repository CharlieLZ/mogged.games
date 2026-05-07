import { getTranslations } from 'next-intl/server';

import { getAppName, replaceBrandTokens } from '@/shared/lib/brand';
import { RequestPasswordResetCard } from '@/shared/blocks/settings';
import { getMetadata } from '@/shared/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('settings.security.reset_password_request');

  return getMetadata({
    title: `${replaceBrandTokens(t('title'))} | ${getAppName()}`,
    description: replaceBrandTokens(t('description')),
    canonicalUrl: '/forgot-password',
    noIndex: true,
  })({ params: Promise.resolve({ locale }) });
}

export default function ForgotPasswordPage() {
  return <RequestPasswordResetCard showBackToSignIn />;
}
