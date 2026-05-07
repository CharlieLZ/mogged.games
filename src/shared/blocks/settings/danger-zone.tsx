'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { signOut } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

interface DangerZoneProps {
  deleteAccountAction: () => Promise<{ success: boolean; error?: string }>;
  namespace?: string;
}

export function DangerZone({
  deleteAccountAction,
  namespace = 'settings.security.danger_zone',
}: DangerZoneProps) {
  const t = useTranslations(namespace);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmValid = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteAccountAction();
      if (result.success) {
        // Sign out and redirect to home
        await signOut({
          fetchOptions: {
            onSuccess: () => {
              router.replace('/');
            },
          },
        });
      } else {
        setError(result.error || t('deleteError'));
        setIsDeleting(false);
      }
    } catch {
      setError(t('deleteError'));
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isDeleting) {
      setIsOpen(open);
      if (!open) {
        setConfirmText('');
        setError(null);
      }
    }
  };

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('deleteAccount')}</p>
              <p className="text-muted-foreground text-sm">
                {t('deleteAccountDescription')}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setIsOpen(true)}
              className="shrink-0"
            >
              {t('deleteButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              {t('confirmTitle')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('confirmDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {t('warningMessage')}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                {t('confirmLabel', { keyword: 'DELETE' })}
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={isDeleting}
              />
            </div>

            {error && <div className="text-destructive text-sm">{error}</div>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isDeleting}
            >
              {t('cancelButton')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!isConfirmValid || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('deletingButton')}
                </>
              ) : (
                t('confirmDeleteButton')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
