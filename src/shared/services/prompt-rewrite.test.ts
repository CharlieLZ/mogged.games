import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rewritePromptForSafety } from './prompt-rewrite';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getAllConfigs: vi.fn(),
  executePromptToolWithCredits: vi.fn(),
}));

vi.mock('@/shared/models/config', () => ({
  getAllConfigs: mocks.getAllConfigs,
}));

vi.mock('@/shared/services/prompt-tool-credits', () => ({
  PromptToolCreditsError: class PromptToolCreditsError extends Error {
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
  executePromptToolWithCredits: mocks.executePromptToolWithCredits,
}));

describe('prompt-rewrite service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllConfigs.mockResolvedValue({
      app_url: 'https://mogged.games',
      app_name: 'mogged',
      openrouter_api_key: 'or-key',
    });
    mocks.executePromptToolWithCredits.mockImplementation(
      async ({
        execute,
      }: {
        execute: () => Promise<Record<string, unknown>>;
      }) => ({
        ...(await execute()),
        costCredits: 2,
        remainingCredits: 8,
      })
    );
    vi.stubGlobal('fetch', vi.fn());
  });

  it('fails fast when the openrouter api key is missing', async () => {
    mocks.getAllConfigs.mockResolvedValue({
      app_url: 'https://mogged.games',
      app_name: 'mogged',
      openrouter_api_key: '',
    });

    await expect(
      rewritePromptForSafety({
        prompt:
          'character saying "your wish is granted", next scene she turns around and farts in your face multiple times',
        mode: 'image-to-video',
        locale: 'en',
        userId: 'user-1',
      })
    ).rejects.toMatchObject({
      code: 'config_missing',
    });
  });

  it('returns a safer rewritten prompt from openrouter', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'rewrite_123',
          model: 'openai/gpt-5-mini',
          choices: [
            {
              message: {
                content:
                  'A playful animated character says, "your wish is granted," then spins away and releases a burst of silly cartoon wind behind her, lighthearted comedy tone, clean 2D staging, no humiliation, no explicit details.',
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    const result = await rewritePromptForSafety({
      prompt:
        'character saying "your wish is granted", next scene she turns around and farts in your face multiple times',
      mode: 'image-to-video',
      locale: 'en',
      userId: 'user-1',
    });

    expect(result).toMatchObject({
      rewrittenPrompt:
        'A playful animated character says, "your wish is granted," then spins away and releases a burst of silly cartoon wind behind her, lighthearted comedy tone, clean 2D staging, no humiliation, no explicit details.',
      model: 'openai/gpt-5-mini',
      requestId: 'rewrite_123',
      costCredits: 2,
      remainingCredits: 8,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.executePromptToolWithCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: 'rewrite-prompt',
        userId: 'user-1',
      })
    );
    expect(fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer or-key',
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://mogged.games',
          'X-OpenRouter-Title': 'mogged',
        }),
      })
    );

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual(
      expect.objectContaining({
        model: 'openai/gpt-5-mini',
        models: ['google/gemini-2.5-flash'],
        messages: expect.any(Array),
      })
    );
  });

  it('retries transient upstream failures with a bounded retry count', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: 'temporary overload',
            },
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'rewrite_retry',
            model: 'google/gemini-2.5-flash',
            choices: [
              {
                message: {
                  content:
                    'A mischievous cartoon character makes a cheeky exit, whimsical comedy staging, playful reaction shot, lighthearted and safe for all audiences.',
                },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      );

    const result = await rewritePromptForSafety({
      prompt:
        'character saying "your wish is granted", next scene she turns around and farts in your face multiple times',
      mode: 'image-to-video',
      locale: 'en',
      userId: 'user-2',
    });

    expect(result.model).toBe('google/gemini-2.5-flash');
    expect(result.costCredits).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
