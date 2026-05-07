'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { getAppName } from '@/shared/lib/brand';
import { getCommonCopy } from '@/shared/lib/common-copy';

const appName = getAppName();

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const copy = getCommonCopy(locale).system_pages.route_error;

  useEffect(() => {
    console.error('[RouteError]', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-start justify-center px-6 py-16">
      <p className="text-muted-foreground text-sm tracking-[0.2em] uppercase">
        {appName}
      </p>
      <h1 className="mt-3 text-3xl font-semibold">{copy.title}</h1>
      <p className="text-muted-foreground mt-3 text-sm">
        {copy.description}
      </p>
      <code className="bg-muted mt-4 rounded px-3 py-2 text-xs">
        {copy.digest_label}: {error.digest || 'n/a'}
      </code>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          {copy.retry}
        </button>
        <Link
          href="/"
          className="border-border rounded-md border px-4 py-2 text-sm font-medium"
        >
          {copy.back_home}
        </Link>
      </div>
    </div>
  );
}
