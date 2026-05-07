function parseOrigin(origin?: string) {
  if (!origin) {
    return null;
  }

  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

function isLoopbackHostname(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]'
  );
}

export function isGoogleOneTapSupportedOrigin(origin?: string) {
  const parsedOrigin = parseOrigin(origin);

  if (!parsedOrigin) {
    return false;
  }

  return !isLoopbackHostname(parsedOrigin.hostname);
}

