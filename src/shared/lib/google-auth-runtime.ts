type ConfigMap = Record<string, string | undefined | null>;

function hasValue(value: string | undefined | null) {
  return Boolean(value?.trim());
}

export function hasGoogleAuthCredentials(configs: ConfigMap) {
  return (
    hasValue(configs.google_client_id) && hasValue(configs.google_client_secret)
  );
}

export function isGoogleAuthRuntimeEnabled(configs: ConfigMap) {
  return (
    configs.google_auth_enabled !== 'false' &&
    hasGoogleAuthCredentials(configs)
  );
}

export function isGoogleOneTapRuntimeEnabled(configs: ConfigMap) {
  return (
    isGoogleAuthRuntimeEnabled(configs) &&
    configs.google_one_tap_enabled !== 'false'
  );
}
