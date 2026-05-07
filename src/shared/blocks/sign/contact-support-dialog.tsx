'use client';

import { FormEvent, ReactNode, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Clock3,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { fetchApiJson } from '@/shared/lib/api/client';
import { cn } from '@/shared/lib/utils';
import type { User } from '@/shared/models/user';

type ContactSupportDialogProps = {
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  supportEmail: string;
  trigger?: ReactNode;
  user: Pick<User, 'id' | 'email' | 'name'>;
};

function createRequestId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `contact-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function buildMailtoHref(email: string, subject: string) {
  const params = new URLSearchParams({ subject });

  return `mailto:${email}?${params.toString()}`;
}

function TrustBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
        {icon}
      </span>
      <span className="text-muted-foreground text-xs font-semibold">
        {label}
      </span>
    </div>
  );
}

export function ContactSupportDialog({
  onOpenChange,
  open,
  supportEmail,
  trigger,
  user,
}: ContactSupportDialogProps) {
  const t = useTranslations('common.contact_support');
  const [internalOpen, setInternalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId, setRequestId] = useState(createRequestId);
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const trimmedMessage = message.trim();
  const canSubmit = trimmedMessage.length >= 10 && !isSubmitting;
  const mailtoSubject = t('mailto_subject');
  const mailtoHref = useMemo(
    () => buildMailtoHref(supportEmail, mailtoSubject),
    [mailtoSubject, supportEmail]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      toast.error(t('validation_error'));
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApiJson('/api/support/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          message: trimmedMessage,
        }),
      });

      toast.success(t('success'));
      setMessage('');
      setRequestId(createRequestId());
      setIsOpen(false);
    } catch (error) {
      console.error('[contact-support-dialog] submit failed', {
        requestId,
        messageLength: trimmedMessage.length,
        error,
      });
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-[520px]">
        <div className="px-6 pt-8 pb-6 sm:px-8">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary text-primary-foreground shadow-primary/25 mb-3 inline-flex items-center gap-3 rounded-full px-6 py-3 text-left shadow-lg">
              <Mail className="size-5" aria-hidden />
              <span className="leading-tight">
                <span className="block text-xs font-bold uppercase">
                  {t('badge_eyebrow')}
                </span>
                <span className="block text-lg font-bold tracking-normal">
                  {t('badge_title')}
                </span>
              </span>
              <Send className="size-4" aria-hidden />
            </div>
            <DialogTitle className="text-3xl font-bold tracking-normal">
              {t('title')}
            </DialogTitle>
            <DialogDescription className="text-base font-semibold">
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="contact-support-email">{t('email_label')}</Label>
              <Input
                id="contact-support-email"
                name="email"
                value={user.email || ''}
                readOnly
                className="bg-muted/35 h-12 text-base font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-support-message">
                {t('message_label')}
              </Label>
              <Textarea
                id="contact-support-message"
                name="message"
                value={message}
                maxLength={2000}
                placeholder={t('message_placeholder')}
                className="min-h-36 resize-y text-base"
                aria-describedby="contact-support-message-help"
                onChange={(event) => setMessage(event.target.value)}
              />
              <p
                id="contact-support-message-help"
                className="text-muted-foreground text-xs"
              >
                {t('message_help', { count: trimmedMessage.length })}
              </p>
            </div>

            <Button type="submit" size="lg" className="h-12 w-full text-base">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {isSubmitting ? t('sending') : t('submit')}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs font-bold uppercase">
              {t('direct_label')}
            </span>
            <div className="bg-border h-px flex-1" />
          </div>

          <a
            href={mailtoHref}
            className={cn(
              'border-border hover:bg-muted/50 focus-visible:ring-ring flex items-center gap-4 rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none'
            )}
          >
            <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-full">
              <Mail className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="text-foreground block font-semibold">
                {t('direct_title')}
              </span>
              <span className="text-muted-foreground block truncate text-sm font-semibold">
                {supportEmail}
              </span>
            </span>
          </a>

          <div className="border-border mt-6 grid grid-cols-3 gap-3 border-t pt-6">
            <TrustBadge
              icon={<Clock3 className="size-4" aria-hidden />}
              label={t('trust_reply')}
            />
            <TrustBadge
              icon={<BadgeCheck className="size-4" aria-hidden />}
              label={t('trust_dedicated')}
            />
            <TrustBadge
              icon={<ShieldCheck className="size-4" aria-hidden />}
              label={t('trust_secure')}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
