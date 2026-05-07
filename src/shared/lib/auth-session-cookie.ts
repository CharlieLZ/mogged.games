const DEFAULT_BETTER_AUTH_COOKIE_PREFIX = 'better-auth';
const SESSION_COOKIE_NAME = 'session_token';

function getSessionCookieNames() {
  const cookieName = `${DEFAULT_BETTER_AUTH_COOKIE_PREFIX}.${SESSION_COOKIE_NAME}`;

  return [cookieName, `__Secure-${cookieName}`];
}

export function hasBetterAuthSessionCookie(
  request: Pick<Request, 'headers'> & {
    cookies?: {
      get: (name: string) => { value?: string } | undefined;
    };
  }
) {
  for (const cookieName of getSessionCookieNames()) {
    const cookieValue = request.cookies?.get(cookieName)?.value;
    if (cookieValue) {
      return true;
    }
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return false;
  }

  return getSessionCookieNames().some((cookieName) =>
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .some((cookie) => cookie.startsWith(`${cookieName}=`))
  );
}
