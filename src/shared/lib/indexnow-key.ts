export const DEFAULT_INDEXNOW_KEY = '7e6d8fcb6763de3be30aedc42e5d1e8a';
export const INDEXNOW_KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

export function isValidIndexNowKey(key?: string | null) {
  if (!key) {
    return false;
  }

  return INDEXNOW_KEY_PATTERN.test(key.trim());
}

export function resolveIndexNowKey(configuredKey?: string | null) {
  const trimmed = configuredKey?.trim();

  if (!trimmed) {
    return DEFAULT_INDEXNOW_KEY;
  }

  return isValidIndexNowKey(trimmed) ? trimmed : DEFAULT_INDEXNOW_KEY;
}

export function getIndexNowRuntimeKey() {
  return resolveIndexNowKey(
    process.env.INDEXNOW_KEY ?? process.env.NEXT_PUBLIC_INDEXNOW_KEY ?? ''
  );
}
