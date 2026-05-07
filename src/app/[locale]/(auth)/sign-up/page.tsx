import { getTranslations } from 'next-intl/server';

import { getAppName, replaceBrandTokens } from '@/shared/lib/brand';
import { SignUp } from '@/shared/blocks/sign/sign-up';
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
    title: `${replaceBrandTokens(t('sign.sign_up_title'))} | ${getAppName()}`,
    description: replaceBrandTokens(t('sign.sign_up_description')),
    canonicalUrl: '/sign-up',
    noIndex: true,
  })({ params: Promise.resolve({ locale }) });
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  const configs = await getPublicConfigs();

  return (
    <SignUp
      configs={configs}
      callbackUrl={callbackUrl || DEFAULT_AUTH_CALLBACK}
      magicLinkErrorCode={error}
    />
  );
}
