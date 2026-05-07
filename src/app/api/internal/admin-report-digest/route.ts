import {
  ADMIN_REPORT_DISPATCH_SECRET_HEADER,
  parseAdminReportDispatchBody,
} from '@/shared/lib/admin-report-cron-dispatch';
import { ADMIN_REPORT_FREQUENCIES } from '@/shared/lib/admin-report-period';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { dispatchAdminReportDigest } from '@/shared/services/admin-report-dispatch';

function getInternalAdminReportDispatchSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
  const normalized = secret.trim();

  if (!normalized) {
    throw new Error(
      'AUTH_SECRET is required for internal admin report dispatch'
    );
  }

  return normalized;
}

async function parseRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let expectedSecret = '';

  try {
    expectedSecret = getInternalAdminReportDispatchSecret();
  } catch (error) {
    console.error('[admin-report][cron-route] auth misconfigured', {
      error,
      step: 'read-secret',
    });
    return respErrWithStatus('Internal Server Error', 500);
  }

  const providedSecret =
    request.headers.get(ADMIN_REPORT_DISPATCH_SECRET_HEADER)?.trim() || '';

  if (!providedSecret || providedSecret !== expectedSecret) {
    return respErrWithStatus('Unauthorized', 401);
  }

  const rawBody = await parseRequestBody(request);
  const parsedBody = parseAdminReportDispatchBody(rawBody);

  if (!parsedBody.success) {
    return respErrWithStatus('invalid admin report dispatch body', 400);
  }

  const now = parsedBody.data.scheduledTime
    ? new Date(parsedBody.data.scheduledTime)
    : new Date();
  const results = [];

  for (const frequency of ADMIN_REPORT_FREQUENCIES) {
    try {
      const result = await dispatchAdminReportDigest({
        frequency,
        now,
      });

      results.push(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error('[admin-report][cron-route] dispatch failed', {
        frequency,
        scheduledTime: parsedBody.data.scheduledTime ?? null,
        error,
        step: 'dispatch',
      });

      return Response.json(
        {
          code: -1,
          message: 'admin report dispatch failed',
          data: {
            failedFrequency: frequency,
            errorMessage,
            completedResults: results,
          },
        },
        {
          status: 500,
        }
      );
    }
  }

  return respData({
    results,
  });
}
