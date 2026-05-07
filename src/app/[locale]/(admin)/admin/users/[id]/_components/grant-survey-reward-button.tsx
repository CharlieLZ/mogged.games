'use client';

import { useFormStatus } from 'react-dom';

import { Button } from '@/shared/components/ui/button';

export function GrantSurveyRewardButton({
  disabled,
  idleLabel,
  pendingLabel,
}: {
  disabled?: boolean;
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending} type="submit">
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
