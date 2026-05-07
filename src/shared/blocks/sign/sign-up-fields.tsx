'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { signUp } from '@/core/auth/client';
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

type SignUpModel = {
  callbackUrl: string;
  clearMagicLinkNotice: () => void;
  configs: Record<string, string>;
  email: string;
  handleMagicLinkSignUp: () => Promise<void>;
  handleSignUp: () => Promise<void>;
  isBusy: boolean;
  isEmailAuthEnabled: boolean;
  isMagicLinkEnabled: boolean;
  loading: boolean;
  magicLinkLoading: boolean;
  magicLinkNotice: string;
  name: string;
  password: string;
  setEmail: (value: string) => void;
  setLoading: (value: boolean) => void;
  setName: (value: string) => void;
  setPassword: (value: string) => void;
};

function reportAffiliate(params: {
  configs: Record<string, string>;
  userEmail: string;
  stripeCustomerId?: string;
}) {
  if (typeof window === 'undefined') {
    return;
  }

  const { configs, userEmail, stripeCustomerId } = params;
  const windowObject = window as typeof window & {
    Affonso?: { signup: (email: string) => void };
    promotekit?: {
      refer: (email: string, customerId?: string) => void;
    };
  };

  if (configs.affonso_enabled === 'true' && windowObject.Affonso) {
    windowObject.Affonso.signup(userEmail);
  }

  if (configs.promotekit_enabled === 'true' && windowObject.promotekit) {
    windowObject.promotekit.refer(userEmail, stripeCustomerId);
  }
}

export function useSignUpModel({
  callbackUrl = DEFAULT_AUTH_CALLBACK,
  configs,
}: {
  callbackUrl?: string;
  configs: Record<string, string>;
}): SignUpModel {
  const router = useRouter();
  const t = useTranslations('common.sign');
  const locale = useLocale();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    emailEnabled: isEmailAuthEnabled,
    magicLinkEnabled: isMagicLinkEnabled,
  } = getAuthAvailability(configs);
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
    errorPath: '/sign-up',
    successMessageKey: 'magic_link_sign_up_sent',
  });
  const isBusy = loading || magicLinkLoading;

  const handleSignUp = async () => {
    if (isBusy) {
      return;
    }

    const normalizedEmail = email.trim();
    const normalizedName = name.trim();

    if (!normalizedEmail || !password || !normalizedName) {
      toast.error(t('email_password_name_required'));
      return;
    }

    let didHandleSuccessfulSignUp = false;
    const handleSuccessfulSignUp = () => {
      if (didHandleSuccessfulSignUp) {
        return;
      }

      didHandleSuccessfulSignUp = true;
      reportAffiliate({
        configs,
        userEmail: normalizedEmail,
      });
      router.push(resolvedCallbackUrl);
    };

    try {
      await signUp.email(
        {
          email: normalizedEmail,
          password,
          name: normalizedName,
        },
        {
          onRequest: () => {
            setLoading(true);
          },
          onSuccess: () => {
            handleSuccessfulSignUp();
          },
          onResponse: (context: any) => {
            setLoading(false);

            if (context?.response?.ok) {
              handleSuccessfulSignUp();
            }
          },
          onError: (error: any) => {
            toast.error(error?.error?.message || t('sign_up_failed'));
            setLoading(false);
          },
        }
      );
    } catch (error: any) {
      toast.error(error?.message || t('sign_up_failed'));
      setLoading(false);
    }
  };

  const handleMagicLinkSignUp = async () => {
    if (isBusy) {
      return;
    }

    await requestMagicLink({ email, name });
  };

  return {
    callbackUrl: resolvedCallbackUrl,
    clearMagicLinkNotice,
    configs,
    email,
    handleMagicLinkSignUp,
    handleSignUp,
    isBusy,
    isEmailAuthEnabled,
    isMagicLinkEnabled,
    loading,
    magicLinkLoading,
    magicLinkNotice,
    name,
    password,
    setEmail,
    setLoading,
    setName,
    setPassword,
  };
}

export function SignUpFields({
  model,
  magicLinkErrorMessage,
}: {
  model: SignUpModel;
  magicLinkErrorMessage?: string;
}) {
  const t = useTranslations('common.sign');

  return (
    <div className="grid gap-4">
      {model.isEmailAuthEnabled ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="name">{t('name_title')}</Label>
            <Input
              id="name"
              type="text"
              placeholder={t('name_placeholder')}
              required
              disabled={model.isBusy}
              onChange={(event) => {
                model.clearMagicLinkNotice();
                model.setName(event.target.value);
              }}
              value={model.name}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">{t('email_title')}</Label>
            <Input
              id="email"
              type="email"
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
            <Label htmlFor="password">{t('password_title')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('password_placeholder')}
              autoComplete="new-password"
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
            onClick={model.handleSignUp}
          >
            {model.loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <span>{t('sign_up_title')}</span>
            )}
          </Button>

          {model.isMagicLinkEnabled ? (
            <MagicLinkAction
              label={t('email_magic_link_title')}
              loading={model.magicLinkLoading}
              disabled={model.isBusy}
              notice={model.magicLinkNotice}
              errorMessage={magicLinkErrorMessage}
              onClick={model.handleMagicLinkSignUp}
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

export function SignUpFooter({
  className,
  isEmailAuthEnabled,
  onRequestSignIn,
}: {
  className?: string;
  isEmailAuthEnabled: boolean;
  onRequestSignIn?: () => void;
}) {
  const t = useTranslations('common.sign');
  const locale = useLocale();
  const signInHref = getLocalizedPath('/sign-in', locale);

  if (!isEmailAuthEnabled) {
    return null;
  }

  return (
    <div className={cn('flex w-full justify-center border-t py-4', className)}>
      <p className="text-muted-foreground flex flex-wrap items-center justify-center gap-1.5 text-center text-xs">
        <span>{t('already_have_account')}</span>
        {onRequestSignIn ? (
          <button
            type="button"
            className="text-foreground/70 cursor-pointer underline underline-offset-4"
            onClick={onRequestSignIn}
          >
            {t('sign_in_title')}
          </button>
        ) : (
          <Link href={signInHref} className="underline underline-offset-4">
            <span className="text-foreground/70 cursor-pointer">
              {t('sign_in_title')}
            </span>
          </Link>
        )}
      </p>
    </div>
  );
}
