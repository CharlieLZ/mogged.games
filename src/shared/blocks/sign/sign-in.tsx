'use client';

import { useTranslations } from 'next-intl';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { DEFAULT_AUTH_CALLBACK } from '@/shared/constants/auth';

import { getMagicLinkErrorTranslationKey } from './magic-link-utils';
import {
  SignInFields,
  SignInFooter,
  useSignInModel,
} from './sign-in-fields';

export function SignIn({
  configs,
  callbackUrl = DEFAULT_AUTH_CALLBACK,
  magicLinkErrorCode,
}: {
  configs: Record<string, string>;
  callbackUrl: string;
  magicLinkErrorCode?: string;
}) {
  const t = useTranslations('common.sign');
  const model = useSignInModel({ callbackUrl, configs });
  const magicLinkErrorKey = getMagicLinkErrorTranslationKey(magicLinkErrorCode);
  const magicLinkErrorMessage = magicLinkErrorKey
    ? t(magicLinkErrorKey)
    : undefined;

  return (
    <Card className="mx-auto w-full md:max-w-md">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">
          <h1>{t('sign_in_title')}</h1>
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          <h2>{t('sign_in_description')}</h2>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignInFields
          model={model}
          magicLinkErrorMessage={magicLinkErrorMessage}
        />
      </CardContent>
      {model.isEmailAuthEnabled && (
        <CardFooter>
          <SignInFooter isEmailAuthEnabled={model.isEmailAuthEnabled} />
        </CardFooter>
      )}
    </Card>
  );
}
