'use client';

import { DEFAULT_AUTH_CALLBACK } from '@/shared/constants/auth';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';

import { SignUpFields, SignUpFooter, useSignUpModel } from './sign-up-fields';

export function SignUpForm({
  callbackUrl = DEFAULT_AUTH_CALLBACK,
  className,
  magicLinkErrorMessage,
  onRequestSignIn,
}: {
  callbackUrl: string;
  className?: string;
  magicLinkErrorMessage?: string;
  onRequestSignIn?: () => void;
}) {
  const { configs } = useAppContext();
  const model = useSignUpModel({ callbackUrl, configs });

  return (
    <div className={cn('w-full md:max-w-md', className)}>
      <SignUpFields
        model={model}
        magicLinkErrorMessage={magicLinkErrorMessage}
      />
      <SignUpFooter
        isEmailAuthEnabled={model.isEmailAuthEnabled}
        onRequestSignIn={onRequestSignIn}
      />
    </div>
  );
}
