import { DEFAULT_APP_URL } from '@/shared/lib/brand';

const CANONICAL_URL = new URL(DEFAULT_APP_URL);
const CANONICAL_HOST = CANONICAL_URL.hostname;
const WWW_HOST = `www.${CANONICAL_HOST}`;

export function getCanonicalHostRedirectUrl(input: string | URL) {
  const requestUrl = typeof input === 'string' ? new URL(input) : new URL(input);
  const normalizedHostname = requestUrl.hostname.toLowerCase();

  if (
    normalizedHostname !== CANONICAL_HOST &&
    normalizedHostname !== WWW_HOST
  ) {
    return null;
  }

  if (
    normalizedHostname === CANONICAL_HOST &&
    requestUrl.protocol === CANONICAL_URL.protocol
  ) {
    return null;
  }

  requestUrl.protocol = CANONICAL_URL.protocol;
  requestUrl.hostname = CANONICAL_HOST;
  requestUrl.port = '';

  return requestUrl.toString();
}
