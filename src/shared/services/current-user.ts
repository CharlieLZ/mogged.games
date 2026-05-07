import { headers } from 'next/headers';

import { getAuth } from '@/core/auth';
import { resolveRequestOrigin } from '@/core/auth/runtime';
import { envConfigs } from '@/config';
import { hasBetterAuthSessionCookie } from '@/shared/lib/auth-session-cookie';

export async function getUserInfo() {
  const signUser = await getSignUser();

  return signUser;
}

export async function getSignUser() {
  const requestHeaders = await headers();
  if (
    !hasBetterAuthSessionCookie({
      headers: requestHeaders,
    })
  ) {
    return null;
  }

  const requestOrigin =
    resolveRequestOrigin({
      originHeader: requestHeaders.get('origin'),
      refererHeader: requestHeaders.get('referer'),
      requestURL: envConfigs.app_url,
    }) ||
    envConfigs.app_url ||
    'http://localhost';
  const authRequest = new Request(`${requestOrigin}/api/auth/session`, {
    headers: requestHeaders,
  });
  try {
    const auth = await getAuth(authRequest);
    const session = await auth.api.getSession({
      headers: requestHeaders,
    });

    return session?.user ?? null;
  } catch (error) {
    console.error('[current-user] get session failed', {
      error,
      step: 'auth-get-session',
    });
    return null;
  }
}
