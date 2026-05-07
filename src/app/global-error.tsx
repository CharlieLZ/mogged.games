'use client';

import { useEffect } from 'react';

import { getAppName } from '@/shared/lib/brand';
import { useClientCommonCopy } from '@/shared/lib/use-client-common-copy';

const appName = getAppName();

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, copy } = useClientCommonCopy();
  const errorCopy = copy.system_pages.global_error;

  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang={locale}>
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center px-6">
        <main className="bg-card/90 border-border/70 shadow-foreground/10 w-full max-w-xl rounded-2xl border p-8 shadow-2xl backdrop-blur">
          <p className="text-muted-foreground text-sm tracking-[0.2em] uppercase">
            {appName}
          </p>
          <h1 className="mt-3 text-3xl font-semibold">{errorCopy.title}</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            {errorCopy.description}{' '}
            <code>
              {errorCopy.digest_label}: {error.digest || 'n/a'}
            </code>
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 rounded-md px-4 py-2 text-sm font-medium"
          >
            {errorCopy.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
