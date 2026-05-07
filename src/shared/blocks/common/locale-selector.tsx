'use client';

import { Suspense } from 'react';
import { useRouter as useNextRouter, useSearchParams } from 'next/navigation';
import { Check, Globe, Languages } from 'lucide-react';
import { useLocale } from 'next-intl';

import { usePathname } from '@/core/i18n/navigation';
import { AppLocale, localeNames, localeSelectorLocales } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useDeferredClientRender } from '@/shared/hooks/use-deferred-client-render';
import {
  buildLocaleSwitchHref,
  persistLocalePreference,
} from '@/shared/lib/locale-routing';

type LocaleSelectorProps = {
  type?: 'icon' | 'button';
  ariaLabel?: string;
};

function LocaleSelectorFallback({
  type = 'icon',
  ariaLabel = 'Change language',
}: LocaleSelectorProps) {
  return (
    <Button
      type="button"
      variant={type === 'icon' ? 'ghost' : 'outline'}
      size={type === 'icon' ? 'icon' : 'sm'}
      aria-label={ariaLabel}
      className={type === 'icon' ? 'h-auto w-auto p-0' : 'hover:bg-primary/10'}
      disabled
    >
      {type === 'icon' ? (
        <Languages size={18} />
      ) : (
        <>
          <Globe size={16} />
        </>
      )}
    </Button>
  );
}

function LocaleSelectorContent({
  type = 'icon',
  ariaLabel = 'Change language',
}: LocaleSelectorProps) {
  const currentLocale = useLocale();
  const router = useNextRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ready = useDeferredClientRender();
  const currentLocaleName =
    localeNames[currentLocale as AppLocale] || currentLocale;

  const handleSwitchLanguage = (value: AppLocale) => {
    if (value !== currentLocale) {
      persistLocalePreference(value);
      router.push(
        buildLocaleSwitchHref({
          pathname,
          locale: value,
          search: searchParams,
          hash: typeof window !== 'undefined' ? window.location.hash : null,
        })
      );
    }
  };

  // Return a placeholder during SSR to avoid hydration mismatch
  if (!ready) {
    return <LocaleSelectorFallback type={type} ariaLabel={ariaLabel} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {type === 'icon' ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={ariaLabel}
            className="h-auto w-auto p-0"
          >
            <Languages size={18} />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={ariaLabel}
            className="hover:bg-primary/10"
          >
            <Globe size={16} />
            {currentLocaleName}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {localeSelectorLocales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleSwitchLanguage(locale)}
          >
            <span>{localeNames[locale]}</span>
            {locale === currentLocale && (
              <Check size={16} className="text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LocaleSelector({
  type = 'icon',
  ariaLabel = 'Change language',
}: LocaleSelectorProps) {
  return (
    <Suspense
      fallback={<LocaleSelectorFallback type={type} ariaLabel={ariaLabel} />}
    >
      <LocaleSelectorContent type={type} ariaLabel={ariaLabel} />
    </Suspense>
  );
}
