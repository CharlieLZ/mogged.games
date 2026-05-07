'use client';

import { useLocale, useTranslations } from 'next-intl';
import { FcGoogle } from 'react-icons/fc';
import { RiGithubFill } from 'react-icons/ri';
import { toast } from 'sonner';

import { signIn } from '@/core/auth/client';
import { Button } from '@/shared/components/ui/button';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';
import { Button as ButtonType } from '@/shared/types/blocks/common';

import {
  isGithubAuthReady,
  isGoogleAuthReady,
  localizeRelativeAuthPath,
} from './auth-utils';

export function SocialProviders({
  configs,
  callbackUrl,
  loading,
  setLoading,
  showDivider = false,
}: {
  configs: Record<string, string>;
  callbackUrl: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showDivider?: boolean;
}) {
  const t = useTranslations('common.sign');
  const locale = useLocale();

  const { setIsShowSignModal } = useAppContext();
  const resolvedCallbackUrl = callbackUrl
    ? localizeRelativeAuthPath(callbackUrl, locale)
    : callbackUrl;

  const handleSignIn = async ({ provider }: { provider: string }) => {
    try {
      await signIn.social(
        {
          provider: provider,
          callbackURL: resolvedCallbackUrl,
        },
        {
          onRequest: () => {
            setLoading(true);
          },
          onResponse: (context: any) => {
            setLoading(false);

            if (context?.response?.ok) {
              setIsShowSignModal(false);
            }
          },
          onSuccess: () => {},
          onError: (e: any) => {
            toast.error(e?.error?.message || t('sign_in_failed'));
            setLoading(false);
          },
        }
      );
    } catch (error: any) {
      toast.error(error?.message || t('sign_in_failed'));
      setLoading(false);
    }
  };

  const isGoogleEnabled = isGoogleAuthReady(configs);
  const isGithubEnabled = isGithubAuthReady(configs);

  const providers: ButtonType[] = [];

  if (isGoogleEnabled) {
    providers.push({
      name: 'google',
      title: t('google_sign_in_title'),
      icon: <FcGoogle aria-hidden="true" className="size-5" />,
      onClick: () => handleSignIn({ provider: 'google' }),
    });
  }

  if (isGithubEnabled) {
    providers.push({
      name: 'github',
      title: t('github_sign_in_title'),
      icon: <RiGithubFill aria-hidden="true" className="size-5" />,
      onClick: () => handleSignIn({ provider: 'github' }),
    });
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="grid w-full gap-3">
      {showDivider ? (
        <div className="flex items-center gap-3 text-xs">
          <span className="bg-border h-px flex-1" />
          <span className="text-muted-foreground">{t('or')}</span>
          <span className="bg-border h-px flex-1" />
        </div>
      ) : null}

      <div
        className={cn(
          'flex w-full items-center gap-2',
          'flex-col justify-between'
        )}
      >
        {providers.map((provider) => (
          <Button
            key={provider.name}
            variant="outline"
            className={cn(
              'h-11 w-full justify-center gap-2 text-sm font-medium'
            )}
            aria-label={provider.title}
            disabled={loading}
            onClick={provider.onClick}
          >
            {provider.icon}
            <span>{provider.title}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
