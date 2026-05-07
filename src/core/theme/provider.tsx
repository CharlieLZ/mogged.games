'use client';

import { ReactNode, useEffect } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  locale,
}: {
  children: ReactNode;
  defaultTheme?: string;
  locale?: string;
}) {
  useEffect(() => {
    if (typeof document !== 'undefined' && locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
