'use client';

import { useEffect, useRef, useState } from 'react';
import { loadStripe, type StripeEmbeddedCheckout } from '@stripe/stripe-js';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer';
import { useMediaQuery } from '@/shared/hooks/use-media-query';

type StripeEmbeddedCheckoutModalProps = {
  clientSecret: string;
  isFinalizing: boolean;
  onComplete: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  publishableKey: string;
};

function StripeEmbeddedCheckoutBody({
  clientSecret,
  isFinalizing,
  onComplete,
  publishableKey,
}: Omit<StripeEmbeddedCheckoutModalProps, 'onOpenChange' | 'open'>) {
  const t = useTranslations('common.payment');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mountError, setMountError] = useState<string | null>(null);
  const [isMounting, setIsMounting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let embeddedCheckout: StripeEmbeddedCheckout | null = null;

    async function mountCheckout() {
      if (!publishableKey.trim()) {
        setMountError(t('embedded_checkout_load_error'));
        setIsMounting(false);
        return;
      }

      try {
        setIsMounting(true);
        setMountError(null);

        const stripe = await loadStripe(publishableKey);
        if (!stripe) {
          throw new Error('stripe_js_load_failed');
        }

        embeddedCheckout = await stripe.createEmbeddedCheckoutPage({
          clientSecret,
          onComplete: () => {
            void onComplete();
          },
        });

        if (cancelled) {
          embeddedCheckout.destroy();
          return;
        }

        if (!containerRef.current) {
          throw new Error('embedded_checkout_container_not_found');
        }

        embeddedCheckout?.mount(containerRef.current);
      } catch (error) {
        console.error('[payment][stripe-embedded] mount failed', {
          step: 'mount',
          error,
        });
        if (!cancelled) {
          setMountError(t('embedded_checkout_load_error'));
        }
      } finally {
        if (!cancelled) {
          setIsMounting(false);
        }
      }
    }

    void mountCheckout();

    return () => {
      cancelled = true;
      embeddedCheckout?.destroy();
    };
  }, [clientSecret, onComplete, publishableKey, t]);

  return (
    <div
      data-slot="stripe-embedded-checkout-modal"
      className="flex min-h-[70vh] flex-col"
    >
      {isMounting ? (
        <div className="text-muted-foreground flex min-h-[12rem] items-center justify-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          <span>{t('embedded_checkout_loading')}</span>
        </div>
      ) : null}

      {mountError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm">
          {mountError}
        </div>
      ) : null}

      <div
        ref={containerRef}
        className={isMounting || mountError ? 'hidden' : 'min-h-[60vh]'}
      />

      {isFinalizing ? (
        <div className="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          <span>{t('embedded_checkout_finalizing')}</span>
        </div>
      ) : null}
    </div>
  );
}

export function StripeEmbeddedCheckoutModal({
  clientSecret,
  isFinalizing,
  onComplete,
  onOpenChange,
  open,
  publishableKey,
}: StripeEmbeddedCheckoutModalProps) {
  const t = useTranslations('common.payment');
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-4xl"
          showCloseButton={!isFinalizing}
        >
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{t('embedded_checkout_title')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('embedded_checkout_loading')}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <StripeEmbeddedCheckoutBody
              clientSecret={clientSecret}
              isFinalizing={isFinalizing}
              onComplete={onComplete}
              publishableKey={publishableKey}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="border-b text-left rtl:text-right">
          <DrawerTitle>{t('embedded_checkout_title')}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 py-5">
          <StripeEmbeddedCheckoutBody
            clientSecret={clientSecret}
            isFinalizing={isFinalizing}
            onComplete={onComplete}
            publishableKey={publishableKey}
          />
        </div>
        {!isFinalizing ? (
          <DrawerFooter className="border-t pt-4">
            <DrawerClose asChild>
              <Button variant="outline">{t('cancel_title')}</Button>
            </DrawerClose>
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
