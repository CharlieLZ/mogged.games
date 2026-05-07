'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

export function MagicLinkAction({
  label,
  loading,
  disabled,
  notice,
  errorMessage,
  onClick,
  className,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  notice?: string;
  errorMessage?: string;
  onClick: () => void | Promise<void>;
  className?: string;
}) {
  const statusMessage = notice || errorMessage;
  const isErrorState = !notice && Boolean(errorMessage);

  return (
    <div className={cn('grid gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={disabled}
        onClick={onClick}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <span>{label}</span>
        )}
      </Button>

      {statusMessage ? (
        <p
          aria-live="polite"
          className={cn(
            'rounded-md border px-3 py-2 text-sm',
            isErrorState
              ? 'border-destructive/20 bg-destructive/5 text-destructive'
              : 'border-border bg-muted/50 text-muted-foreground'
          )}
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
