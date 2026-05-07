'use client';

import { MouseEvent, ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';

import { getCommonCopy } from '@/shared/lib/common-copy';
import { cn } from '@/shared/lib/utils';

type SupportEmailLinkProps = {
  email: string;
  children?: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  title?: string;
  'aria-label'?: string;
};

async function copyText(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', 'true');
  input.style.position = 'absolute';
  input.style.left = '-9999px';

  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(input);

  return copied;
}

function getFeedbackMessage(locale: string, email: string, copied: boolean) {
  const copy = getCommonCopy(locale).support_email;
  const template = copied ? copy.copied : copy.unavailable;

  return template.replace('{email}', email);
}

export function SupportEmailLink({
  email,
  children,
  className,
  target,
  rel,
  title,
  'aria-label': ariaLabel,
}: SupportEmailLinkProps) {
  const locale = useLocale();
  const href = `mailto:${email}`;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    void copyText(email)
      .then((copied) => {
        toast.success(getFeedbackMessage(locale, email, copied));
      })
      .catch(() => {
        toast.success(getFeedbackMessage(locale, email, false));
      });
  };

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      title={title || email}
      aria-label={ariaLabel}
      className={cn(className)}
      onClick={handleClick}
    >
      {children || email}
    </a>
  );
}
