// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore `.open-next/worker.js` is generated at build time.
import { default as handler } from './.open-next/worker.js';

import { dispatchAdminReportDigestViaHandler } from './src/shared/lib/admin-report-cron-dispatch';
import { getCanonicalHostRedirectUrl } from './src/shared/lib/canonical-host-redirect';

type WorkerContext = { waitUntil(promise: Promise<unknown>): void };

async function runScheduledAdminReports({
  scheduledTime,
  env,
  ctx,
}: {
  scheduledTime: number;
  env: Record<string, unknown>;
  ctx: WorkerContext;
}) {
  try {
    const result = await dispatchAdminReportDigestViaHandler({
      fetchHandler: handler.fetch,
      env,
      ctx,
      scheduledTime,
    });

    console.log('[admin-report][cron]', result);
  } catch (error) {
    console.error('[admin-report][cron] failed', {
      scheduledTime,
      error,
      step: 'dispatch-via-handler',
    });
    throw error;
  }
}

export default {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
    ctx: WorkerContext
  ) {
    const canonicalRedirectUrl = getCanonicalHostRedirectUrl(request.url);

    if (canonicalRedirectUrl) {
      return Response.redirect(canonicalRedirectUrl, 308);
    }

    return handler.fetch(request, env, ctx);
  },

  async scheduled(
    controller: { scheduledTime: number },
    env: Record<string, unknown>,
    ctx: WorkerContext
  ) {
    ctx.waitUntil(
      runScheduledAdminReports({
        scheduledTime: controller.scheduledTime,
        env,
        ctx,
      })
    );
  },
};

// The re-export keeps OpenNext cache handlers available when present.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore `.open-next/worker.js` is generated at build time.
export { DOQueueHandler, DOShardedTagCache } from './.open-next/worker.js';
