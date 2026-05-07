'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { resetPassword } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { getLocalizedPath } from '@/core/i18n/localized-path';
import { FORGOT_PASSWORD_PATH } from '@/shared/constants/auth';
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

export function ResetPasswordCard({ token: tokenProp }: { token?: string }) {
  const t = useTranslations('settings.security');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fallbackSignInHref = useMemo(
    () => getLocalizedPath('/sign-in', locale),
    [locale]
  );
  const fallbackRequestNewLinkHref = useMemo(
    () => getLocalizedPath(FORGOT_PASSWORD_PATH, locale),
    [locale]
  );

  const callbackUrl =
    searchParams.get('callbackURL') || searchParams.get('callbackUrl');
  const nextHref =
    callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : fallbackSignInHref;
  const token =
    tokenProp?.trim() || searchParams.get('token')?.trim() || '';
  const resetError = searchParams.get('error');
  const hasInvalidTokenError = resetError === 'INVALID_TOKEN';

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!token.trim()) {
      toast.error(t('reset_password_confirm.messages.tokenMissing'));
      return;
    }

    if (!newPassword.trim()) {
      toast.error(t('reset_password_confirm.messages.newPasswordRequired'));
      return;
    }

    if (!confirmPassword.trim()) {
      toast.error(t('reset_password_confirm.messages.confirmPasswordRequired'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('reset_password_confirm.messages.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({
        newPassword,
        token,
      });

      toast.success(t('reset_password_confirm.messages.updated'));
      router.replace(nextHref);
    } catch (error) {
      toast.error(
        getErrorMessage(error, t('reset_password_confirm.messages.updateFailed'))
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto w-full md:max-w-md">
      <CardHeader>
        <CardTitle>{t('reset_password_confirm.title')}</CardTitle>
        <CardDescription>
          {t('reset_password_confirm.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {hasInvalidTokenError ? (
          <p className="text-destructive text-sm">
            {t('reset_password_confirm.messages.invalidOrExpiredLink')}
          </p>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="reset-new-password">
            {t('fields.new_password')}
          </Label>
          <Input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reset-confirm-password">
            {t('fields.confirm_password')}
          </Label>
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </CardContent>
      <CardFooter className="bg-muted/40 flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t('reset_password_confirm.buttons.submitting')}
            </>
          ) : (
            t('reset_password_confirm.buttons.submit')
          )}
        </Button>
        {hasInvalidTokenError ? (
          <Button
            variant="outline"
            onClick={() => router.push(fallbackRequestNewLinkHref)}
            disabled={isSubmitting}
          >
            {t('reset_password_confirm.buttons.request_new_link')}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          onClick={() => router.push(fallbackSignInHref)}
          disabled={isSubmitting}
        >
          {t('reset_password_confirm.buttons.back_to_sign_in')}
        </Button>
      </CardFooter>
    </Card>
  );
}
