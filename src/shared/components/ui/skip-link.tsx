'use client';

import type { AnchorHTMLAttributes, MouseEvent } from 'react';

import { cn } from '@/shared/lib/utils';

type SkipLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: `#${string}`;
};

export function SkipLink({
  className,
  href,
  onClick,
  children,
  ...props
}: SkipLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (event.defaultPrevented || typeof document === 'undefined') {
      return;
    }

    const targetId = href.slice(1);
    if (!targetId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.focus();
    });
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={cn(
        'sr-only fixed top-3 left-4 z-[80] rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow-md ring-1 ring-border focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rtl:left-auto rtl:right-4',
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}
