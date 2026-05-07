import { z } from 'zod';

export const ADMIN_REPORT_DISPATCH_PATH = '/api/internal/admin-report-digest';
export const ADMIN_REPORT_DISPATCH_SECRET_HEADER =
  'x-imageeditorai-internal-auth';

const adminReportDispatchBodySchema = z.object({
  scheduledTime: z.number().int().positive().optional(),
});

const MAX_ADMIN_REPORT_DISPATCH_ATTEMPTS = 2;
const RETRIABLE_ADMIN_REPORT_DISPATCH_STATUSES = new Set([
  429, 500, 502, 503, 504,
]);

export type AdminReportDispatchBody = z.infer<
  typeof adminReportDispatchBodySchema
>;

export type AdminReportCronDispatchEnv = {
  AUTH_SECRET?: string;
  NEXTAUTH_SECRET?: string;
  AUTH_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

export type AdminReportCronDispatchContext = {
  waitUntil(promise: Promise<unknown>): void;
};

export type AdminReportFetchHandler = (
  request: Request,
  env: AdminReportCronDispatchEnv,
  ctx: AdminReportCronDispatchContext
) => Promise<Response>;

export function parseAdminReportDispatchBody(value: unknown) {
  return adminReportDispatchBodySchema.safeParse(value);
}

function resolveAdminReportDispatchBaseUrl(env: AdminReportCronDispatchEnv) {
  const value =
    env.AUTH_URL?.trim() ||
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://mogged.games';

  try {
    return new URL(value).toString();
  } catch {
    throw new Error(
      'AUTH_URL or NEXT_PUBLIC_APP_URL is invalid for admin report cron dispatch'
    );
  }
}

function resolveAdminReportDispatchSecret(env: AdminReportCronDispatchEnv) {
  const secret = env.AUTH_SECRET?.trim() || env.NEXTAUTH_SECRET?.trim();

  if (!secret) {
    throw new Error('AUTH_SECRET is required for admin report cron dispatch');
  }

  return secret;
}

async function readResponseTextSafe(response: Response) {
  try {
    return (await response.text()).slice(0, 1000);
  } catch {
    return '';
  }
}

export async function dispatchAdminReportDigestViaHandler({
  fetchHandler,
  env,
  ctx,
  scheduledTime,
}: {
  fetchHandler: AdminReportFetchHandler;
  env: AdminReportCronDispatchEnv;
  ctx: AdminReportCronDispatchContext;
  scheduledTime: number;
}) {
  const baseUrl = resolveAdminReportDispatchBaseUrl(env);
  const secret = resolveAdminReportDispatchSecret(env);
  const requestBody: AdminReportDispatchBody = {
    scheduledTime,
  };
  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= MAX_ADMIN_REPORT_DISPATCH_ATTEMPTS;
    attempt++
  ) {
    const request = new Request(
      new URL(ADMIN_REPORT_DISPATCH_PATH, baseUrl).toString(),
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [ADMIN_REPORT_DISPATCH_SECRET_HEADER]: secret,
        },
        body: JSON.stringify(requestBody),
      }
    );

    try {
      const response = await fetchHandler(request, env, ctx);

      if (response.ok) {
        return await response.json().catch(() => null);
      }

      const responseText = await readResponseTextSafe(response);
      const error = new Error(
        `[admin-report][cron] internal dispatch failed with ${response.status}${responseText ? `: ${responseText}` : ''}`
      );

      if (
        attempt < MAX_ADMIN_REPORT_DISPATCH_ATTEMPTS &&
        RETRIABLE_ADMIN_REPORT_DISPATCH_STATUSES.has(response.status)
      ) {
        lastError = error;
        console.warn('[admin-report][cron] retrying internal dispatch', {
          attempt,
          status: response.status,
        });
        continue;
      }

      throw error;
    } catch (error) {
      lastError = error;

      if (attempt >= MAX_ADMIN_REPORT_DISPATCH_ATTEMPTS) {
        throw error;
      }

      console.warn('[admin-report][cron] internal dispatch attempt failed', {
        attempt,
        error,
      });
    }
  }

  throw (
    lastError ||
    new Error('[admin-report][cron] internal dispatch failed unexpectedly')
  );
}
