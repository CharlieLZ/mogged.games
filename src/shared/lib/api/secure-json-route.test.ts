import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { getUserInfo } from '@/shared/services/current-user';

import { enforceApiWriteSecurity } from './request-security';
import { createSecureJsonPostRoute } from './secure-json-route';

vi.mock('server-only', () => ({}));

vi.mock('./request-security', () => ({
  createApiPreflightResponse: vi.fn(() => new Response(null, { status: 204 })),
  enforceApiWriteSecurity: vi.fn(),
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: vi.fn(),
}));

describe('secure json route', () => {
  beforeEach(() => {
    vi.mocked(enforceApiWriteSecurity).mockReset();
    vi.mocked(getUserInfo).mockReset();
    vi.mocked(enforceApiWriteSecurity).mockResolvedValue(null);
  });

  it('rejects invalid json payloads before handler execution', async () => {
    vi.mocked(getUserInfo).mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
    } as never);

    const handler = vi.fn();
    const { POST } = createSecureJsonPostRoute({
      actionName: 'demo-post',
      schema: z.object({
        value: z.string(),
      }),
      parseErrorMessage: 'invalid payload',
      handler,
    });

    const response = await POST(
      new Request('https://example.com/api/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: '{invalid-json',
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'invalid payload',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('applies user-scoped rate limit before handler execution', async () => {
    vi.mocked(getUserInfo).mockResolvedValue({
      id: 'user-2',
      email: 'demo@example.com',
    } as never);

    const handler = vi.fn();
    const limiter = vi.fn().mockResolvedValue({
      success: false,
      limit: 3,
      remaining: 0,
      reset: Date.now() + 10_000,
    });

    const { POST } = createSecureJsonPostRoute({
      actionName: 'demo-post',
      schema: z.object({
        value: z.string(),
      }),
      parseErrorMessage: 'invalid payload',
      rateLimit: {
        limiter,
        keyPrefix: 'demo',
        message: 'too many requests',
      },
      handler,
    });

    const response = await POST(
      new Request('https://example.com/api/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
          'x-forwarded-for': '1.2.3.4',
        },
        body: JSON.stringify({ value: 'ok' }),
      })
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'too many requests',
    });
    expect(limiter).toHaveBeenCalledWith('demo:1.2.3.4:user-2');
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes parsed body and current user into the business handler', async () => {
    vi.mocked(getUserInfo).mockResolvedValue({
      id: 'user-3',
      email: 'demo@example.com',
    } as never);

    const handler = vi.fn().mockResolvedValue(
      Response.json({
        code: 0,
        message: 'ok',
      })
    );

    const { POST } = createSecureJsonPostRoute({
      actionName: 'demo-post',
      schema: z.object({
        value: z.string(),
      }),
      parseErrorMessage: 'invalid payload',
      handler,
    });

    const response = await POST(
      new Request('https://example.com/api/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({ value: 'hello' }),
      })
    );

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { value: 'hello' },
        user: expect.objectContaining({ id: 'user-3' }),
      })
    );
  });

  it('rejects anonymous requests instead of falling back to guest viewers', async () => {
    vi.mocked(getUserInfo).mockResolvedValue(null as never);

    const handler = vi.fn().mockResolvedValue(
      Response.json({
        code: 0,
        message: 'ok',
      })
    );

    const { POST } = createSecureJsonPostRoute({
      actionName: 'demo-post',
      schema: z.object({
        value: z.string(),
      }),
      parseErrorMessage: 'invalid payload',
      handler,
    });

    const response = await POST(
      new Request('https://example.com/api/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({ value: 'guest-mode' }),
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'no auth, please sign in',
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
