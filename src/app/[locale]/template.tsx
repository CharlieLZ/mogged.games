import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

export default async function LocaleTemplate({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();

  // Keep route-scoped messages inside a template so App Router refreshes
  // them on navigation instead of reusing a stale shared layout payload.
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
