import { getTranslations } from 'next-intl/server';
import { redirect } from '@/core/i18n/navigation';

import { getAppName, replaceBrandTokens } from '@/shared/lib/brand';
import { getMetadata } from '@/shared/lib/seo';
import { RESET_PASSWORD_PATH } from '@/shared/constants/auth';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
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

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ callbackURL?: string; callbackUrl?: string }>;
}) {
  const [{ locale, token }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const callbackUrl =
    resolvedSearchParams.callbackURL || resolvedSearchParams.callbackUrl;
  const href = callbackUrl
    ? `${RESET_PASSWORD_PATH}?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(callbackUrl)}`
    : `${RESET_PASSWORD_PATH}?token=${encodeURIComponent(token)}`;

  redirect({ href, locale });
}
