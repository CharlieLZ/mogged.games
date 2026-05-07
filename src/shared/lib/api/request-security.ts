type WriteSecurityOptions = {
  allowMissingOriginInNonProduction?: boolean;
};

function normalizeOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins() {
  const values = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
    process.env.NEXT_PUBLIC_DOMAIN
      ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
      : undefined,
  ];

  return new Set(
    values.map((value) => normalizeOrigin(value || null)).filter(Boolean)
  );
}

function resolveRequestOrigin(request: Request) {
  const urlOrigin = normalizeOrigin(request.url);
  if (urlOrigin) {
    return urlOrigin;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');
  if (!host && !forwardedHost) {
    return null;
  }

  const protocol =
    forwardedProto ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  return normalizeOrigin(`${protocol}://${forwardedHost || host}`);
}

function errorResponse(message: string, status = 403) {
  return Response.json(
    {
      code: -1,
      message,
    },
    { status }
  );
}

export async function enforceApiWriteSecurity(
  request: Request,
  actionName: string,
  options: WriteSecurityOptions = {}
) {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null;
  }

  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    console.warn(`[RequestSecurity] blocked "${actionName}" due to sec-fetch-site`, {
      secFetchSite,
    });
    return errorResponse('Invalid request origin');
  }

  const origin = normalizeOrigin(request.headers.get('origin'));
  const referer = normalizeOrigin(request.headers.get('referer'));
  const requestOrigin = resolveRequestOrigin(request);
  const allowedOrigins = getAllowedOrigins();

  const isTrusted =
    [origin, referer].some(
      (candidate) =>
        candidate &&
        (allowedOrigins.has(candidate) ||
          (requestOrigin ? candidate === requestOrigin : false))
    ) || false;

  if (!isTrusted) {
    const allowMissingOriginInNonProduction =
      options.allowMissingOriginInNonProduction ?? true;
    const hasOriginSignal = Boolean(origin || referer);

    if (
      !hasOriginSignal &&
      requestOrigin &&
      allowMissingOriginInNonProduction &&
      process.env.NODE_ENV !== 'production'
    ) {
      return null;
    }

    console.warn(`[RequestSecurity] blocked "${actionName}" due to origin`, {
      origin,
      referer,
      requestOrigin,
    });
    return errorResponse('Invalid request origin');
  }

  return null;
}

export function createApiPreflightResponse(methods = 'POST, OPTIONS') {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || '*';

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers':
        'Content-Type, Idempotency-Key, X-Requested-With',
      Vary: 'Origin',
    },
  });
}
