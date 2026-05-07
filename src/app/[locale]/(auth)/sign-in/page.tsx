import { getTranslations } from 'next-intl/server';

import { getAppName, replaceBrandTokens } from '@/shared/lib/brand';
import { SignIn } from '@/shared/blocks/sign/sign-in';
import { DEFAULT_AUTH_CALLBACK } from '@/shared/constants/auth';
import { getMetadata } from '@/shared/lib/seo';
import { getPublicConfigs } from '@/shared/models/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('common');

  return getMetadata({
    title: `${replaceBrandTokens(t('sign.sign_in_title'))} | ${getAppName()}`,
    description: replaceBrandTokens(t('sign.sign_in_description')),
    canonicalUrl: '/sign-in',
    noIndex: true,
  })({ params: Promise.resolve({ locale }) });
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  const configs = await getPublicConfigs();

  return (
    <SignIn
      configs={configs}
      callbackUrl={callbackUrl || DEFAULT_AUTH_CALLBACK}
      magicLinkErrorCode={error}
    />
  );
}
