import { toNextJsHandler } from 'better-auth/next-js';

import { getAuth } from '@/core/auth';
import { respErrWithStatus } from '@/shared/lib/resp';

async function logAuthFailure(request: Request, response: Response) {
  const url = new URL(request.url);
  const isSocialStart = url.pathname.endsWith('/sign-in/social');
  const isGoogleCallback = url.pathname.endsWith('/callback/google');
  const redirectLocation = response.headers.get('location');
  const redirectError = redirectLocation
    ? new URL(redirectLocation, url.origin).searchParams.get('error')
    : null;

  if (
    !isSocialStart &&
    !isGoogleCallback &&
    response.status < 400 &&
    !redirectError
  ) {
    return;
  }

  let body = '';
  if (response.status >= 400) {
    try {
      body = await response.clone().text();
    } catch {
      body = '';
    }
  }

  console.error('[auth] request failed', {
    path: url.pathname,
    status: response.status,
    redirectLocation,
    redirectError,
    body: body.slice(0, 500),
  });
}

export async function POST(request: Request) {
  return handleAuthRequest(request, 'POST');
}

export async function GET(request: Request) {
  return handleAuthRequest(request, 'GET');
}

async function handleAuthRequest(request: Request, method: 'GET' | 'POST') {
  const url = new URL(request.url);

  try {
    const auth = await getAuth(request);
    const handler = toNextJsHandler(auth.handler);
    const response =
      method === 'GET'
        ? await handler.GET(request)
        : await handler.POST(request);
    await logAuthFailure(request, response);
    return response;
  } catch (error) {
    console.error('[auth] request crashed', {
      error,
      method,
      path: url.pathname,
      step: 'auth-handler',
    });

    return respErrWithStatus('auth request failed', 500, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}
