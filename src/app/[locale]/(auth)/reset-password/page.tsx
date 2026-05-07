import { getTranslations } from 'next-intl/server';

import { getAppName, replaceBrandTokens } from '@/shared/lib/brand';
import { ResetPasswordCard } from '@/shared/blocks/settings';
import { getMetadata } from '@/shared/lib/seo';
import { RESET_PASSWORD_PATH } from '@/shared/constants/auth';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('settings.security.reset_password_confirm');

  return getMetadata({
    title: `${replaceBrandTokens(t('title'))} | ${getAppName()}`,
    description: replaceBrandTokens(t('description')),
    canonicalUrl: RESET_PASSWORD_PATH,
    noIndex: true,
  })({ params: Promise.resolve({ locale }) });
}

export default function ResetPasswordPage() {
  return <ResetPasswordCard />;
}
