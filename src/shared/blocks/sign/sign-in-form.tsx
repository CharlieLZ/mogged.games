'use client';

import { DEFAULT_AUTH_CALLBACK } from '@/shared/constants/auth';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';

import { SignInFields, SignInFooter, useSignInModel } from './sign-in-fields';

export function SignInForm({
  callbackUrl = DEFAULT_AUTH_CALLBACK,
  className,
  magicLinkErrorMessage,
  onRequestSignUp,
}: {
  callbackUrl: string;
  className?: string;
  magicLinkErrorMessage?: string;
  onRequestSignUp?: () => void;
}) {
  const { configs } = useAppContext();
  const model = useSignInModel({ callbackUrl, configs });

  return (
    <div className={cn('w-full md:max-w-md', className)}>
      <SignInFields
        model={model}
        magicLinkErrorMessage={magicLinkErrorMessage}
      />
      <SignInFooter
        isEmailAuthEnabled={model.isEmailAuthEnabled}
        onRequestSignUp={onRequestSignUp}
      />
    </div>
  );
}
