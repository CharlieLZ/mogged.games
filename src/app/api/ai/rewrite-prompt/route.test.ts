import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  enforceApiWriteSecurity: vi.fn(),
  getUserInfo: vi.fn(),
  limiter: vi.fn(),
  rewritePromptForSafety: vi.fn(),
}));

vi.mock('@/shared/lib/api/request-security', () => ({
  createApiPreflightResponse: vi.fn(() => new Response(null, { status: 204 })),
  enforceApiWriteSecurity: mocks.enforceApiWriteSecurity,
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: mocks.getUserInfo,
}));

vi.mock('@/shared/lib/api/rate-limit', () => ({
  rateLimit: vi.fn(() => mocks.limiter),
  buildUserRateLimitKey: vi.fn(() => 'rewrite:user-1'),
  createRateLimitErrorResponse: vi.fn(() =>
    Response.json(
      {
        code: -1,
        message: 'too many rewrite attempts, please slow down',
      },
      { status: 429 }
    )
  ),
}));

vi.mock('@/shared/services/prompt-rewrite', () => ({
  PromptRewriteError: class PromptRewriteError extends Error {
    code: string;
    status: number;

    constructor(
      code: string,
      message: string,
      options?: {
        status?: number;
      }
    ) {
      super(message);
      this.code = code;
      this.status = options?.status ?? 500;
    }
  },
  rewritePromptForSafety: mocks.rewritePromptForSafety,
}));

describe('/api/ai/rewrite-prompt contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceApiWriteSecurity.mockResolvedValue(null);
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
    });
    mocks.limiter.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });
    mocks.rewritePromptForSafety.mockResolvedValue({
      rewrittenPrompt:
        'A playful animated character grants a wish, turns away, and lands the beat with silly slapstick comedy, safe-for-all-audiences framing, no explicit details.',
      model: 'openai/gpt-5-mini',
      requestId: 'rewrite_123',
    });
  });

  it('rejects schema-invalid rewrite payloads with a 400 response', async () => {
    const response = await POST(
      new Request('https://example.com/api/ai/rewrite-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          prompt: '',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'invalid rewrite prompt payload',
    });
    expect(mocks.rewritePromptForSafety).not.toHaveBeenCalled();
  });

  it('returns the rewritten prompt envelope on success', async () => {
    const response = await POST(
      new Request('https://example.com/api/ai/rewrite-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          prompt:
            'character saying "your wish is granted", next scene she turns around and farts in your face multiple times',
          mode: 'image-to-video',
          locale: 'en',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        rewrittenPrompt:
          'A playful animated character grants a wish, turns away, and lands the beat with silly slapstick comedy, safe-for-all-audiences framing, no explicit details.',
        model: 'openai/gpt-5-mini',
        requestId: 'rewrite_123',
      },
    });
    expect(mocks.rewritePromptForSafety).toHaveBeenCalledWith({
      prompt:
        'character saying "your wish is granted", next scene she turns around and farts in your face multiple times',
      mode: 'image-to-video',
      locale: 'en',
      userId: 'user-1',
    });
  });

  it('maps config failures to a 503 response', async () => {
    mocks.rewritePromptForSafety.mockRejectedValue(
      new Error('openrouter_api_key is missing')
    );

    const response = await POST(
      new Request('https://example.com/api/ai/rewrite-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          prompt:
            'character saying "your wish is granted", next scene she turns around and farts in your face multiple times',
          mode: 'image-to-video',
          locale: 'en',
        }),
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'openrouter_api_key is missing',
    });
  });
});
