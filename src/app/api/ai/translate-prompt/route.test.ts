import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  enforceApiWriteSecurity: vi.fn(),
  getUserInfo: vi.fn(),
  limiter: vi.fn(),
  translatePromptToEnglish: vi.fn(),
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
  buildUserRateLimitKey: vi.fn(() => 'translate:user-1'),
  createRateLimitErrorResponse: vi.fn(() =>
    Response.json(
      {
        code: -1,
        message: 'too many translate attempts, please slow down',
      },
      { status: 429 }
    )
  ),
}));

vi.mock('@/shared/services/prompt-translation', () => ({
  PromptTranslationError: class PromptTranslationError extends Error {
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
  translatePromptToEnglish: mocks.translatePromptToEnglish,
}));

describe('/api/ai/translate-prompt contract', () => {
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
    mocks.translatePromptToEnglish.mockResolvedValue({
      translatedPrompt:
        'A silver horse gallops through falling snow at sunrise, cinematic wide shot.',
      model: 'openai/gpt-5-mini',
      requestId: 'gen_123',
      targetLanguage: 'en',
    });
  });

  it('rejects schema-invalid translate payloads with a 400 response', async () => {
    const response = await POST(
      new Request('https://example.com/api/ai/translate-prompt', {
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
      message: 'invalid translate prompt payload',
    });
    expect(mocks.translatePromptToEnglish).not.toHaveBeenCalled();
  });

  it('returns the translated prompt envelope on success', async () => {
    const response = await POST(
      new Request('https://example.com/api/ai/translate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          prompt: '一匹银色的马在清晨飘雪中狂奔',
          mode: 'text-to-video',
          locale: 'zh',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        translatedPrompt:
          'A silver horse gallops through falling snow at sunrise, cinematic wide shot.',
        model: 'openai/gpt-5-mini',
        requestId: 'gen_123',
        targetLanguage: 'en',
      },
    });
    expect(mocks.translatePromptToEnglish).toHaveBeenCalledWith({
      prompt: '一匹银色的马在清晨飘雪中狂奔',
      mode: 'text-to-video',
      locale: 'zh',
      userId: 'user-1',
    });
  });

  it('maps config failures to a 503 response', async () => {
    mocks.translatePromptToEnglish.mockRejectedValue(
      new Error('openrouter_api_key is missing')
    );

    const response = await POST(
      new Request('https://example.com/api/ai/translate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          prompt: '请翻译成英文',
          mode: 'reference-to-video',
          locale: 'zh',
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
