type ResolveAuthClientBaseURLParams = {
  authURL?: string;
  appURL?: string;
  windowOrigin?: string;
};

type ResolveAuthServerRuntimeConfigParams = {
  authURL?: string;
  appURL?: string;
  requestOrigin?: string;
};

function trimTrailingSlash(url?: string) {
  return url?.trim().replace(/\/+$/, '') ?? '';
}

function toOrigin(url?: string) {
  const normalized = trimTrailingSlash(url);

  if (!normalized) {
    return '';
  }

  try {
    return new URL(normalized).origin;
  } catch {
    return normalized;
  }
}

export function resolveAuthClientBaseURL({
  authURL,
  appURL,
  windowOrigin,
}: ResolveAuthClientBaseURLParams) {
  return trimTrailingSlash(windowOrigin || authURL || appURL);
}

export function resolveAuthServerRuntimeConfig({
  authURL,
  appURL,
  requestOrigin,
}: ResolveAuthServerRuntimeConfigParams) {
  const configuredBaseURL = trimTrailingSlash(authURL || appURL);
  const runtimeBaseURL = trimTrailingSlash(requestOrigin);
  const baseURL = runtimeBaseURL || configuredBaseURL;

  const trustedOrigins = Array.from(
    new Set(
      [toOrigin(authURL), toOrigin(appURL), toOrigin(runtimeBaseURL)].filter(
        Boolean
      )
    )
  );

  return {
    baseURL,
    trustedOrigins,
  };
}

export function getAuthClientOptions(
  params: ResolveAuthClientBaseURLParams = {}
) {
  const baseURL = resolveAuthClientBaseURL(params);

  return {
    ...(baseURL ? { baseURL } : {}),
  };
}

export function resolveAuthEndpoint(
  path: string,
  params?: ResolveAuthClientBaseURLParams
) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseURL = resolveAuthClientBaseURL({
    authURL: params?.authURL,
    appURL: params?.appURL,
    windowOrigin:
      params?.windowOrigin ??
      (typeof window !== 'undefined' ? window.location.origin : undefined),
  });

  if (!baseURL) {
    return `/api/auth${normalizedPath}`;
  }

  return `${baseURL}/api/auth${normalizedPath}`;
}

export function resolveRequestOrigin(params: {
  originHeader?: string | null;
  refererHeader?: string | null;
  requestURL?: string;
}) {
  const originHeader = toOrigin(params.originHeader || undefined);
  if (originHeader) {
    return originHeader;
  }

  const requestOrigin = toOrigin(params.requestURL);
  if (requestOrigin) {
    return requestOrigin;
  }

  // Referer can point at third-party identity providers like
  // accounts.google.com during OAuth callbacks. Never let that override the
  // callback URL origin for server auth routing.
  return toOrigin(params.refererHeader || undefined);
}
