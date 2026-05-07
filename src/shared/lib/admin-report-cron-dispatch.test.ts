import { describe, expect, it, vi } from 'vitest';

import {
  ADMIN_REPORT_DISPATCH_PATH,
  ADMIN_REPORT_DISPATCH_SECRET_HEADER,
  dispatchAdminReportDigestViaHandler,
} from './admin-report-cron-dispatch';

describe('dispatchAdminReportDigestViaHandler', () => {
  it('calls the generated fetch handler with the internal admin report route', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValue(Response.json({ code: 0, data: { results: [] } }));
    const ctx = {
      waitUntil: vi.fn(),
    };

    await dispatchAdminReportDigestViaHandler({
      fetchHandler,
      env: {
        AUTH_SECRET: 'cron-secret',
        AUTH_URL: 'https://mogged.games',
      },
      ctx,
      scheduledTime: 1700000000000,
    });

    expect(fetchHandler).toHaveBeenCalledTimes(1);

    const [request, env, handlerCtx] = fetchHandler.mock.calls[0];

    expect(env).toMatchObject({
      AUTH_SECRET: 'cron-secret',
      AUTH_URL: 'https://mogged.games',
    });
    expect(handlerCtx).toBe(ctx);
    expect(request.url).toBe(
      `https://mogged.games${ADMIN_REPORT_DISPATCH_PATH}`
    );
    expect(request.method).toBe('POST');
    expect(request.headers.get('content-type')).toContain('application/json');
    expect(request.headers.get(ADMIN_REPORT_DISPATCH_SECRET_HEADER)).toBe(
      'cron-secret'
    );
    await expect(request.json()).resolves.toEqual({
      scheduledTime: 1700000000000,
    });
  });

  it('retries once when the handler returns a retriable 500 response', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('temporary failure', {
          status: 500,
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          data: { results: [] },
        })
      );

    await dispatchAdminReportDigestViaHandler({
      fetchHandler,
      env: {
        AUTH_SECRET: 'cron-secret',
        NEXT_PUBLIC_APP_URL: 'https://mogged.games',
      },
      ctx: {
        waitUntil: vi.fn(),
      },
      scheduledTime: 1700000000000,
    });

    expect(fetchHandler).toHaveBeenCalledTimes(2);
  });

  it('fails fast when the auth secret is missing', async () => {
    const fetchHandler = vi.fn();

    await expect(
      dispatchAdminReportDigestViaHandler({
        fetchHandler,
        env: {
          AUTH_URL: 'https://mogged.games',
        },
        ctx: {
          waitUntil: vi.fn(),
        },
        scheduledTime: 1700000000000,
      })
    ).rejects.toThrow('AUTH_SECRET is required for admin report cron dispatch');

    expect(fetchHandler).not.toHaveBeenCalled();
  });
});
