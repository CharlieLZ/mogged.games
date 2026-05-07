import {
  defaultLocale,
  localeMessagesPaths,
  resolveAppLocale,
} from '@/config/locale';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';
import { getPublicConfigs } from '@/shared/models/config';

const missingLocaleWarnings = new Set<string>();
const knownMessagePaths = new Set<string>(localeMessagesPaths);

function createLocaleMessageLoadError(
  locale: string,
  messagePath: string,
  cause: unknown
) {
  return new Error(
    `[i18n] Failed to load required locale messages for path "${messagePath}" and locale "${locale}"`,
    { cause }
  );
}

async function readLocaleMessageFile(locale: string, messagePath: string) {
  if (!knownMessagePaths.has(messagePath)) {
    throw new Error(`Unknown locale message path: ${messagePath}`);
  }

  const [namespace, name, extra] = messagePath.split('/');

  if (!namespace || extra) {
    throw new Error(`Unsupported locale message path: ${messagePath}`);
  }

  const messages = name
    ? await import(
        `@/config/locale/messages/${locale}/${namespace}/${name}.json`
      )
    : await import(`@/config/locale/messages/${locale}/${namespace}.json`);

  return (messages.default ?? messages) as Record<string, unknown>;
}

export async function loadMessages(
  path: string,
  locale: string = defaultLocale,
  publicConfigs?: Record<string, string>
) {
  const effectiveLocale = resolveAppLocale(locale);
  const resolvedPublicConfigs = publicConfigs ?? (await getPublicConfigs());

  try {
    const messages = await readLocaleMessageFile(effectiveLocale, path);
    return replaceBrandTokensDeep(messages, resolvedPublicConfigs);
  } catch (localeError) {
    if (effectiveLocale === defaultLocale) {
      throw createLocaleMessageLoadError(effectiveLocale, path, localeError);
    }

    try {
      const messages = await readLocaleMessageFile(defaultLocale, path);

      const warningKey = `${effectiveLocale}:${path}`;
      if (!missingLocaleWarnings.has(warningKey)) {
        missingLocaleWarnings.add(warningKey);
        console.warn('[i18n] Falling back to default locale messages', {
          error: localeError,
          requestedLocale: locale,
          resolvedLocale: effectiveLocale,
          fallbackLocale: defaultLocale,
          path,
        });
      }

      return replaceBrandTokensDeep(messages, resolvedPublicConfigs);
    } catch (fallbackError) {
      throw new Error(
        `[i18n] Failed to load locale messages for path "${path}" with requested locale "${locale}" and fallback locale "${defaultLocale}"`,
        {
          cause: {
            localeError,
            fallbackError,
          },
        }
      );
    }
  }
}
