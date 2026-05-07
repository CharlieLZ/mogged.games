import { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import {
  getEmailFromMailto,
  isExternalHref,
  isMailtoHref,
} from '@/shared/lib/support-link';

import { SupportEmailLink } from './support-email-link';

type SmartLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  title?: string;
  'aria-label'?: string;
};

export function SmartLink({
  href,
  children,
  className,
  target,
  rel,
  title,
  'aria-label': ariaLabel,
}: SmartLinkProps) {
  if (isMailtoHref(href)) {
    const email = getEmailFromMailto(href);

    if (email) {
      return (
        <SupportEmailLink
          email={email}
          className={className}
          target={target}
          rel={rel}
          title={title}
          aria-label={ariaLabel}
        >
          {children}
        </SupportEmailLink>
      );
    }
  }

  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        target={target}
        rel={rel || (target === '_blank' ? 'noopener noreferrer' : undefined)}
        title={title}
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      title={title}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </Link>
  );
}
