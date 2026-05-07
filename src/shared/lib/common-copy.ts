import { resolveAppLocale } from '@/config/locale';

import arCommon from '@/config/locale/messages/ar/common.json';
import deCommon from '@/config/locale/messages/de/common.json';
import enCommon from '@/config/locale/messages/en/common.json';
import esCommon from '@/config/locale/messages/es/common.json';
import frCommon from '@/config/locale/messages/fr/common.json';
import itCommon from '@/config/locale/messages/it/common.json';
import jaCommon from '@/config/locale/messages/ja/common.json';
import koCommon from '@/config/locale/messages/ko/common.json';
import zhCommon from '@/config/locale/messages/zh/common.json';

const commonCopyByLocale = {
  en: enCommon,
  zh: zhCommon,
  de: deCommon,
  fr: frCommon,
  es: esCommon,
  ja: jaCommon,
  it: itCommon,
  ko: koCommon,
  ar: arCommon,
} as const;

export type CommonCopy = typeof enCommon;

export function getCommonCopy(locale?: string | null): CommonCopy {
  return commonCopyByLocale[resolveAppLocale(locale)];
}
