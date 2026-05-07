import { magicLinkClient, oneTapClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { defaultLocale, normalizeAppLocale } from '@/config/locale';
import { LOCALE_COOKIE_NAME } from '@/shared/lib/locale-routing';

import { isGoogleOneTapSupportedOrigin } from './one-tap-runtime';
import { getAuthClientOptions } from './runtime';

function getWindowOrigin() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.location.origin;
}

function getBaseAuthClientOptions() {
  return getAuthClientOptions({
    windowOrigin: getWindowOrigin(),
  });
}

function resolveAuthLocaleFromWindow() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const pathname = window.location?.pathname || '/';
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return normalizeAppLocale(firstSegment) ?? defaultLocale;
}

export function persistAuthLocalePreference() {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const locale = resolveAuthLocaleFromWindow();
  if (!locale) {
    return undefined;
  }

  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; SameSite=Lax`;
  return locale;
}

function wrapAuthMethod<TArgs extends unknown[], TResult>(
  method: ((...args: TArgs) => TResult) | undefined
) {
  return (...args: TArgs): TResult => {
    persistAuthLocalePreference();

    if (typeof method !== 'function') {
      throw new Error('auth method unavailable');
    }

    return method(...args);
  };
}

function isGoogleOneTapEnabled(configs?: Record<string, string>) {
  if (
    typeof window === 'undefined' ||
    !isGoogleOneTapSupportedOrigin(window.location.origin) ||
    !configs ||
    configs.google_auth_enabled !== 'true' ||
    configs.google_one_tap_enabled !== 'true' ||
    !configs.google_client_id?.trim()
  ) {
    return false;
  }

  return true;
}

function getBaseAuthPlugins() {
  return [magicLinkClient()];
}

function getAuthPlugins(configs?: Record<string, string>) {
  if (!configs || !isGoogleOneTapEnabled(configs)) {
    return getBaseAuthPlugins();
  }

  const googleOneTapClientId = configs.google_client_id.trim();

  return [
    ...getBaseAuthPlugins(),
    oneTapClient({
      clientId: googleOneTapClientId,
      autoSelect: false,
      cancelOnTapOutside: false,
      context: 'signin',
      promptOptions: {
        baseDelay: 1000,
        maxAttempts: 1,
      },
    }),
  ];
}

function createConfiguredAuthClient(configs?: Record<string, string>) {
  return createAuthClient({
    ...getBaseAuthClientOptions(),
    plugins: configs ? getAuthPlugins(configs) : getBaseAuthPlugins(),
  });
}

const baseAuthClient = createConfiguredAuthClient();

export function getAuthClient(configs?: Record<string, string>) {
  if (!isGoogleOneTapEnabled(configs)) {
    return baseAuthClient;
  }

  return createAuthClient({
    ...getBaseAuthClientOptions(),
    plugins: getAuthPlugins(configs),
  });
}

export const authClient = baseAuthClient;

export const { useSession, signOut } = authClient;

export const signIn = {
  ...authClient.signIn,
  email: wrapAuthMethod(authClient.signIn.email),
  magicLink: wrapAuthMethod(authClient.signIn.magicLink),
  social: wrapAuthMethod(authClient.signIn.social),
} as typeof authClient.signIn;

export const signUp = {
  ...authClient.signUp,
  email: wrapAuthMethod(authClient.signUp.email),
} as typeof authClient.signUp;

export const requestPasswordReset = wrapAuthMethod(
  authClient.requestPasswordReset
);

export const resetPassword = wrapAuthMethod(authClient.resetPassword);

export const changePassword = wrapAuthMethod(authClient.changePassword);
