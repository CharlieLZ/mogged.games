// .source folder will be generated when you run `next dev`
import { createElement } from 'react';
import { pages } from '@/.source/server';
import type { I18nConfig } from 'fumadocs-core/i18n';
import { loader } from 'fumadocs-core/source';
import { icons } from 'lucide-react';

import { locales } from '@/config/locale';

export const i18n: I18nConfig = {
  defaultLanguage: 'en',
  languages: [...locales],
};

const iconHelper = (icon: string | undefined) => {
  if (!icon) {
    // You may set a default icon
    return;
  }
  if (icon in icons) return createElement(icons[icon as keyof typeof icons]);
};

// Pages source (using root path)
export const pagesSource = loader({
  baseUrl: '/',
  source: pages.toFumadocsSource(),
  i18n,
  icon: iconHelper,
});

export const source = pagesSource;
