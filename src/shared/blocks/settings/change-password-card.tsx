'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { changePassword } from '@/core/auth/client';
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

export function ChangePasswordCard() {
  const t = useTranslations('settings.security');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!currentPassword.trim()) {
      toast.error(t('change_password.messages.currentPasswordRequired'));
      return;
    }

    if (!newPassword.trim()) {
      toast.error(t('change_password.messages.newPasswordRequired'));
      return;
    }

    if (!confirmPassword.trim()) {
      toast.error(t('change_password.messages.confirmPasswordRequired'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('change_password.messages.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('change_password.messages.updated'));
    } catch (error) {
      toast.error(
        getErrorMessage(error, t('change_password.messages.updateFailed'))
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t('change_password.title')}</CardTitle>
        <CardDescription>{t('change_password.description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="current-password">
            {t('fields.current_password')}
          </Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-password">{t('fields.new_password')}</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-password">
            {t('fields.confirm_password')}
          </Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </CardContent>
      <CardFooter className="bg-muted/40">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t('change_password.buttons.submitting')}
            </>
          ) : (
            t('change_password.buttons.submit')
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
