'use client';

import { ReactNode } from 'react';
import { CopyIcon } from 'lucide-react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { toast } from 'sonner';

import { useClientCommonCopy } from '@/shared/lib/use-client-common-copy';

export function Copy({
  value,
  metadata,
  className,
  children,
}: {
  value: string;
  metadata?: Record<string, any>;
  className?: string;
  children: ReactNode;
}) {
  const { copy } = useClientCommonCopy();
  const maxLength = metadata?.maxLength ?? 80;
  const displayValue = typeof children === 'string' && children.length > maxLength
    ? children.substring(0, maxLength) + '...'
    : children;

  return (
    <CopyToClipboard
      text={value}
      onCopy={() => toast.success(metadata?.message ?? copy.feedback.copied)}
    >
      <div className={`flex cursor-pointer items-center gap-2 ${className}`}>
        <span className="truncate max-w-md text-sm">{displayValue}</span>
        <CopyIcon className="h-3 w-3 shrink-0" />
      </div>
    </CopyToClipboard>
  );
}
