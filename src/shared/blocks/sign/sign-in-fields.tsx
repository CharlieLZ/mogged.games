'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { signIn } from '@/core/auth/client';
import { getLocalizedPath } from '@/core/i18n/localized-path';
import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { DEFAULT_AUTH_CALLBACK } from '@/shared/constants/auth';
import { cn } from '@/shared/lib/utils';

import { getAuthAvailability, localizeRelativeAuthPath } from './auth-utils';
import { MagicLinkAction } from './magic-link-action';
import { SocialProviders } from './social-providers';
import { useMagicLinkRequest } from './use-magic-link-request';

type SignInModel = {
  callbackUrl: string;
  clearMagicLinkNotice: () => void;
  configs: Record<string, string>;
  email: string;
  handleMagicLinkSignIn: () => Promise<void>;
  isEmailAuthEnabled: boolean;
  isMagicLinkEnabled: boolean;
  isBusy: boolean;
  loading: boolean;
  magicLinkLoading: boolean;
  magicLinkNotice: string;
  password: string;
  setLoading: (value: boolean) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  handleSignIn: () => Promise<void>;
};

export function useSignInModel({
  callbackUrl = DEFAULT_AUTH_CALLBACK,
  configs,
}: {
  callbackUrl?: string;
  configs: Record<string, string>;
}): SignInModel {
  const t = useTranslations('common.sign');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const resolvedCallbackUrl = callbackUrl
    ? localizeRelativeAuthPath(callbackUrl, locale)
    : DEFAULT_AUTH_CALLBACK;
  const {
    clearNotice: clearMagicLinkNotice,
    isSending: magicLinkLoading,
    notice: magicLinkNotice,
    requestMagicLink,
  } = useMagicLinkRequest({
    callbackUrl: resolvedCallbackUrl,
    errorPath: '/sign-in',
    successMessageKey: 'magic_link_sign_in_sent',
  });

  const {
    emailEnabled: isEmailAuthEnabled,
    magicLinkEnabled: isMagicLinkEnabled,
  } = getAuthAvailability(configs);
  const isBusy = loading || magicLinkLoading;

  const handleSignIn = async () => {
    if (isBusy) {
      return;
    }

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      toast.error(t('email_password_required'));
      return;
    }

    try {
      setLoading(true);

      await signIn.email(
        {
          email: normalizedEmail,
          password,
          callbackURL: resolvedCallbackUrl,
        },
        {
          onRequest: () => {
            setLoading(true);
          },
          onResponse: () => {
            setLoading(false);
          },
          onSuccess: () => {},
          onError: (error: any) => {
            toast.error(error?.error?.message || t('sign_in_failed'));
            setLoading(false);
          },
        }
      );
    } catch (error: any) {
      toast.error(error?.message || t('sign_in_failed'));
      setLoading(false);
    }
  };

  const handleMagicLinkSignIn = async () => {
    if (isBusy) {
      return;
    }

    await requestMagicLink({ email });
  };

  return {
    callbackUrl: resolvedCallbackUrl,
    clearMagicLinkNotice,
    configs,
    email,
    handleMagicLinkSignIn,
    isEmailAuthEnabled,
    isMagicLinkEnabled,
    isBusy,
    loading,
    magicLinkLoading,
    magicLinkNotice,
    password,
    setLoading,
    setEmail,
    setPassword,
    handleSignIn,
  };
}

export function SignInFields({
  model,
  magicLinkErrorMessage,
}: {
  model: SignInModel;
  magicLinkErrorMessage?: string;
}) {
  const t = useTranslations('common.sign');
  const locale = useLocale();
  const forgotPasswordHref = getLocalizedPath('/forgot-password', locale);

  return (
    <div className="grid gap-4">
      {model.isEmailAuthEnabled ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="email">{t('email_title')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t('email_placeholder')}
              required
              disabled={model.isBusy}
              onChange={(event) => {
                model.clearMagicLinkNotice();
                model.setEmail(event.target.value);
              }}
              value={model.email}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <Label htmlFor="password">{t('password_title')}</Label>
              <Link
                href={forgotPasswordHref}
                className="text-muted-foreground hover:text-foreground ml-auto inline-flex text-sm underline underline-offset-4"
              >
                {t('forgot_password')}
              </Link>
            </div>

            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t('password_placeholder')}
              required
              disabled={model.isBusy}
              value={model.password}
              onChange={(event) => {
                model.clearMagicLinkNotice();
                model.setPassword(event.target.value);
              }}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={model.isBusy}
            onClick={model.handleSignIn}
          >
            {model.loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <span>{t('sign_in_title')}</span>
            )}
          </Button>

          {model.isMagicLinkEnabled ? (
            <MagicLinkAction
              label={t('email_magic_link_title')}
              loading={model.magicLinkLoading}
              disabled={model.isBusy}
              notice={model.magicLinkNotice}
              errorMessage={magicLinkErrorMessage}
              onClick={model.handleMagicLinkSignIn}
            />
          ) : null}
        </>
      ) : null}

      <SocialProviders
        configs={model.configs}
        callbackUrl={model.callbackUrl}
        loading={model.isBusy}
        setLoading={model.setLoading}
        showDivider={model.isEmailAuthEnabled}
      />
    </div>
  );
}

export function SignInFooter({
  className,
  isEmailAuthEnabled,
  onRequestSignUp,
}: {
  className?: string;
  isEmailAuthEnabled: boolean;
  onRequestSignUp?: () => void;
}) {
  const t = useTranslations('common.sign');
  const locale = useLocale();
  const signUpHref = getLocalizedPath('/sign-up', locale);

  if (!isEmailAuthEnabled) {
    return null;
  }

  return (
    <div className={cn('flex w-full justify-center border-t py-4', className)}>
      <p className="text-muted-foreground flex flex-wrap items-center justify-center gap-1.5 text-center text-xs">
        <span>{t('no_account')}</span>
        {onRequestSignUp ? (
          <button
            type="button"
            className="text-foreground/70 cursor-pointer underline underline-offset-4"
            onClick={onRequestSignUp}
          >
            {t('sign_up_title')}
          </button>
        ) : (
          <Link href={signUpHref} className="underline underline-offset-4">
            <span className="text-foreground/70 cursor-pointer">
              {t('sign_up_title')}
            </span>
          </Link>
        )}
      </p>
    </div>
  );
}
