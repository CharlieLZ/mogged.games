'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { requestPasswordReset } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { getLocalizedPath } from '@/core/i18n/localized-path';
import { RESET_PASSWORD_PATH } from '@/shared/constants/auth';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'error' in error &&
    error.error &&
    typeof error.error === 'object' &&
    'message' in error.error &&
    typeof error.error.message === 'string'
  ) {
    return error.error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function RequestPasswordResetCard({
  defaultEmail = '',
  redirectTo,
  signInHref,
  showBackToSignIn = false,
}: {
  defaultEmail?: string;
  redirectTo?: string;
  signInHref?: string;
  showBackToSignIn?: boolean;
}) {
  const t = useTranslations('settings.security');
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const localizedSignInHref = useMemo(
    () => signInHref || getLocalizedPath('/sign-in', locale),
    [locale, signInHref]
  );
  const localizedResetPasswordHref = useMemo(
    () => redirectTo || getLocalizedPath(RESET_PASSWORD_PATH, locale),
    [locale, redirectTo]
  );

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!email.trim()) {
      toast.error(t('reset_password_request.messages.emailRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      await requestPasswordReset({
        email: email.trim(),
        redirectTo: localizedResetPasswordHref,
      });

      setIsSent(true);
      toast.success(t('reset_password_request.messages.sent'));
    } catch (error) {
      toast.error(
        getErrorMessage(error, t('reset_password_request.messages.sendFailed'))
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full md:max-w-md">
      <CardHeader>
        <CardTitle>{t('reset_password_request.title')}</CardTitle>
        <CardDescription>
          {t('reset_password_request.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="reset-email">{t('fields.email')}</Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            placeholder={t('reset_password_request.email_placeholder')}
          />
        </div>
        <p className="text-muted-foreground text-sm">
          {isSent
            ? t('reset_password_request.sent_hint')
            : t('reset_password_request.tip')}
        </p>
      </CardContent>
      <CardFooter className="bg-muted/40 flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t('reset_password_request.buttons.submitting')}
            </>
          ) : (
            t('reset_password_request.buttons.submit')
          )}
        </Button>
        {showBackToSignIn ? (
          <Button
            variant="ghost"
            onClick={() => router.push(localizedSignInHref)}
            disabled={isSubmitting}
          >
            {t('reset_password_request.buttons.back_to_sign_in')}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
