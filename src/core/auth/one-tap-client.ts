import { getAuthClient, persistAuthLocalePreference } from './client';
import { isGoogleOneTapSupportedOrigin } from './one-tap-runtime';

type GooglePromptContext = 'signin' | 'signup' | 'use';
type OneTapErrorStep = 'initialize' | 'callback';
type OneTapPromptNotification = {
  getMomentType?: () => string;
};
type OneTapFetchError = {
  error?: unknown;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'unknown error';
}

function logOneTapError(step: OneTapErrorStep, error: unknown) {
  console.warn('[auth][one-tap] failed', {
    step,
    message: getErrorMessage(error),
    error,
  });
}

function isGoogleOneTapReady(configs: Record<string, string>) {
  const origin =
    typeof window !== 'undefined' ? window.location?.origin : undefined;

  return (
    configs.google_auth_enabled === 'true' &&
    configs.google_one_tap_enabled === 'true' &&
    Boolean(configs.google_client_id?.trim()) &&
    isGoogleOneTapSupportedOrigin(origin)
  );
}

export async function triggerGoogleOneTap({
  configs,
  context = 'signin',
  autoSelect = false,
  cancelOnTapOutside = false,
  onSuccess,
  onPromptNotification,
}: {
  configs: Record<string, string>;
  context?: GooglePromptContext;
  autoSelect?: boolean;
  cancelOnTapOutside?: boolean;
  onSuccess?: () => void | Promise<void>;
  onPromptNotification?: (notification: OneTapPromptNotification) => void;
}) {
  if (typeof window === 'undefined' || !window.document) {
    return false;
  }

  if (!isGoogleOneTapReady(configs)) {
    if (
      window.location?.origin &&
      !isGoogleOneTapSupportedOrigin(window.location.origin)
    ) {
      console.info('[auth][one-tap] skipped on unsupported origin', {
        origin: window.location.origin,
      });
      return false;
    }

    logOneTapError('initialize', new Error('missing google client id'));
    return false;
  }

  const authClient = getAuthClient(configs) as {
    oneTap?: (options?: Record<string, unknown>) => Promise<unknown>;
  };

  if (typeof authClient.oneTap !== 'function') {
    logOneTapError('initialize', new Error('one tap client plugin unavailable'));
    return false;
  }

  try {
    persistAuthLocalePreference();

    await authClient.oneTap({
      context,
      autoSelect,
      cancelOnTapOutside,
      onPromptNotification,
      fetchOptions: {
        onSuccess: async () => {
          await onSuccess?.();
        },
        onError: (context: OneTapFetchError) => {
          logOneTapError('callback', context.error);
        },
      },
    });

    return true;
  } catch (error) {
    logOneTapError('initialize', error);
    return false;
  }
}
