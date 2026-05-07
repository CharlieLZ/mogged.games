import { z } from 'zod';

import { respErrWithStatus } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/services/current-user';

import {
  buildUserRateLimitKey,
  createRateLimitErrorResponse,
  rateLimit,
} from './rate-limit';
import {
  createApiPreflightResponse,
  enforceApiWriteSecurity,
} from './request-security';

type SecureRouteUser = NonNullable<Awaited<ReturnType<typeof getUserInfo>>>;
type SecureRouteContext = {
  request: Request;
  user: SecureRouteUser;
};

type SecureRouteRateLimitConfig = {
  limiter: ReturnType<typeof rateLimit>;
  keyPrefix: string;
  message: string;
  includeRetryAfter?: boolean;
  keyBuilder?: (context: {
    request: Request;
    user: SecureRouteUser;
  }) => string | Promise<string>;
};

type SecureJsonRouteContext<TBody> = {
  request: Request;
  user: SecureRouteUser;
  body: TBody;
};

type SecureRouteBaseOptions = {
  actionName: string;
  unauthorizedMessage?: string;
  unauthorizedStatus?: number;
  rateLimit?: SecureRouteRateLimitConfig;
};

type SecureRouteOptions = SecureRouteBaseOptions & {
  authorize?: (
    context: SecureRouteContext
  ) => Promise<Response | null> | Response | null;
  handler: (context: SecureRouteContext) => Promise<Response> | Response;
};

type SecureJsonRouteOptions<TBody> = SecureRouteBaseOptions & {
  schema: z.ZodType<TBody>;
  parseErrorMessage: string;
  authorize?: (
    context: Omit<SecureJsonRouteContext<TBody>, 'body'> & { body?: TBody }
  ) => Promise<Response | null> | Response | null;
  handler: (
    context: SecureJsonRouteContext<TBody>
  ) => Promise<Response> | Response;
};

async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function resolveSecureRouteContext(
  request: Request,
  options: SecureRouteBaseOptions
): Promise<SecureRouteContext | Response> {
  const securityResponse = await enforceApiWriteSecurity(
    request,
    options.actionName
  );
  if (securityResponse) {
    return securityResponse;
  }

  const user = await getUserInfo();
  if (!user) {
    return respErrWithStatus(
      options.unauthorizedMessage || 'no auth, please sign in',
      options.unauthorizedStatus || 401
    );
  }

  if (options.rateLimit) {
    const key = options.rateLimit.keyBuilder
      ? await options.rateLimit.keyBuilder({ request, user })
      : buildUserRateLimitKey(
          options.rateLimit.keyPrefix,
          request.headers,
          user.id
        );

    const result = await options.rateLimit.limiter(key);
    if (!result.success) {
      return createRateLimitErrorResponse(result, options.rateLimit.message, {
        includeRetryAfter: options.rateLimit.includeRetryAfter,
      });
    }
  }

  return {
    request,
    user,
  };
}

export function createSecurePostRoute(options: SecureRouteOptions) {
  return {
    async OPTIONS() {
      return createApiPreflightResponse();
    },

    async POST(request: Request) {
      const contextOrResponse = await resolveSecureRouteContext(
        request,
        options
      );
      if (contextOrResponse instanceof Response) {
        return contextOrResponse;
      }

      const authResponse = options.authorize
        ? await options.authorize(contextOrResponse)
        : null;
      if (authResponse) {
        return authResponse;
      }

      return options.handler(contextOrResponse);
    },
  };
}

export function createSecureJsonPostRoute<TBody>(
  options: SecureJsonRouteOptions<TBody>
) {
  return {
    async OPTIONS() {
      return createApiPreflightResponse();
    },

    async POST(request: Request) {
      const contextOrResponse = await resolveSecureRouteContext(
        request,
        options
      );
      if (contextOrResponse instanceof Response) {
        return contextOrResponse;
      }

      const rawBody = await parseJsonBody(request);
      const parsedBody = options.schema.safeParse(rawBody);
      if (!parsedBody.success) {
        return respErrWithStatus(options.parseErrorMessage, 400);
      }

      const authResponse = options.authorize
        ? await options.authorize({
            ...contextOrResponse,
            body: parsedBody.data,
          })
        : null;
      if (authResponse) {
        return authResponse;
      }

      return options.handler({
        ...contextOrResponse,
        body: parsedBody.data,
      });
    },
  };
}
