'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { signIn } from '@/core/auth/client';
import { getLocalizedPath } from '@/core/i18n/localized-path';
import { DEFAULT_AUTH_CALLBACK } from '@/shared/constants/auth';

import {
  appendCallbackUrlToAuthPath,
  localizeRelativeAuthPath,
} from './auth-utils';

type MagicLinkSuccessMessageKey =
  | 'magic_link_sign_in_sent'
  | 'magic_link_sign_up_sent';

function resolveMagicLinkName(params: { email: string; name?: string | null }) {
  const normalizedName = params.name?.trim();

  if (normalizedName) {
    return normalizedName;
  }

  const fallbackName = params.email.split('@')[0]?.trim();
  return fallbackName || undefined;
}

export function useMagicLinkRequest(params?: {
  callbackUrl?: string;
  errorPath?: '/sign-in' | '/sign-up';
  successMessageKey?: MagicLinkSuccessMessageKey;
}) {
  const locale = useLocale();
  const t = useTranslations('common.sign');
  const [notice, setNotice] = useState('');
  const [isSending, setIsSending] = useState(false);

  const resolvedCallbackUrl = localizeRelativeAuthPath(
    params?.callbackUrl || DEFAULT_AUTH_CALLBACK,
    locale
  );
  const resolvedErrorPath = appendCallbackUrlToAuthPath(
    getLocalizedPath(params?.errorPath || '/sign-in', locale),
    resolvedCallbackUrl
  );
  const successMessageKey =
    params?.successMessageKey || 'magic_link_sign_in_sent';

  const clearNotice = () => {
    setNotice('');
  };

  const requestMagicLink = async (input: {
    email: string;
    name?: string | null;
  }) => {
    if (isSending) {
      return false;
    }

    const normalizedEmail = input.email.trim();

    if (!normalizedEmail) {
      toast.error(t('magic_link_email_required'));
      return false;
    }

    const magicLinkName = resolveMagicLinkName({
      email: normalizedEmail,
      name: input.name,
    });
    let errorMessage = '';

    clearNotice();
    setIsSending(true);

    try {
      await signIn.magicLink(
        {
          email: normalizedEmail,
          callbackURL: resolvedCallbackUrl,
          newUserCallbackURL: resolvedCallbackUrl,
          errorCallbackURL: resolvedErrorPath,
          ...(magicLinkName ? { name: magicLinkName } : {}),
        },
        {
          onError: (error: any) => {
            errorMessage = error?.error?.message || t('magic_link_failed');
          },
        }
      );
    } catch (error: any) {
      errorMessage = error?.message || t('magic_link_failed');
    } finally {
      setIsSending(false);
    }

    if (errorMessage) {
      toast.error(errorMessage);
      return false;
    }

    const successMessage = t(successMessageKey, { email: normalizedEmail });
    setNotice(successMessage);
    toast.success(t('magic_link_sent_toast'));
    return true;
  };

  return {
    clearNotice,
    isSending,
    notice,
    requestMagicLink,
  };
}
