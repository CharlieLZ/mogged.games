'use client';

import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { resolveClientAuthCallback } from '@/core/auth/callback';
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
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer';
import { useAppContext } from '@/shared/contexts/app';
import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { cn } from '@/shared/lib/utils';

import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';

function AuthModalExplainer({
  benefits,
  kicker,
  securityNote,
  className,
}: {
  benefits: string[];
  kicker: string;
  securityNote: string;
  className?: string;
}) {
  return (
    <div
      data-slot="auth-modal-explainer"
      className={cn(
        'border-border bg-muted/40 grid gap-3 rounded-lg border p-3 text-sm',
        className
      )}
    >
      <div className="grid gap-2">
        <p className="text-foreground font-medium">{kicker}</p>
        <ul className="text-muted-foreground grid gap-1.5">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2">
              <CheckCircle2
                aria-hidden="true"
                className="text-primary mt-0.5 size-4 shrink-0"
              />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-muted-foreground border-border border-t pt-3 text-xs leading-relaxed">
        {securityNote}
      </p>
    </div>
  );
}

export function SignModal({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations('common.sign');
  const {
    authModalView,
    isShowSignModal,
    setAuthModalView,
    setIsShowSignModal,
  } = useAppContext();
  const resolvedCallbackUrl = resolveClientAuthCallback(callbackUrl);
  const isSignUpView = authModalView === 'sign-up';
  const title = isSignUpView
    ? t('sign_up_modal_title')
    : t('sign_in_modal_title');
  const description = isSignUpView
    ? t('sign_up_modal_description')
    : t('sign_in_modal_description');
  const explainer = isSignUpView
    ? {
        kicker: t('sign_up_modal_kicker'),
        benefits: [
          t('sign_up_modal_benefit_1'),
          t('sign_up_modal_benefit_2'),
          t('sign_up_modal_benefit_3'),
        ],
        securityNote: t('sign_up_modal_security_note'),
      }
    : {
        kicker: t('sign_in_modal_kicker'),
        benefits: [
          t('sign_in_modal_benefit_1'),
          t('sign_in_modal_benefit_2'),
          t('sign_in_modal_benefit_3'),
        ],
        securityNote: t('sign_in_modal_security_note'),
      };
  const handleOpenChange = (open: boolean) => {
    setIsShowSignModal(open);

    if (!open) {
      setAuthModalView('sign-in');
    }
  };

  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    if (!isShowSignModal && authModalView !== 'sign-in') {
      setAuthModalView('sign-in');
    }
  }, [authModalView, isShowSignModal, setAuthModalView]);

  if (isDesktop) {
    return (
      <Dialog open={isShowSignModal} onOpenChange={handleOpenChange}>
        <DialogContent className="gap-5 sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <AuthModalExplainer {...explainer} />
          {isSignUpView ? (
            <SignUpForm
              callbackUrl={resolvedCallbackUrl}
              onRequestSignIn={() => setAuthModalView('sign-in')}
            />
          ) : (
            <SignInForm
              callbackUrl={resolvedCallbackUrl}
              onRequestSignUp={() => setAuthModalView('sign-up')}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isShowSignModal} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left rtl:text-right">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <AuthModalExplainer className="mx-4" {...explainer} />
        {isSignUpView ? (
          <SignUpForm
            callbackUrl={resolvedCallbackUrl}
            className="mt-5 px-4"
            onRequestSignIn={() => setAuthModalView('sign-in')}
          />
        ) : (
          <SignInForm
            callbackUrl={resolvedCallbackUrl}
            className="mt-5 px-4"
            onRequestSignUp={() => setAuthModalView('sign-up')}
          />
        )}
        <DrawerFooter className="pt-4">
          <DrawerClose asChild>
            <Button variant="outline">{t('cancel_title')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
