import { beforeEach, describe, expect, it, vi } from 'vitest';

import { translatePromptToEnglish } from './prompt-translation';

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

describe('prompt-translation service', () => {
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
        costCredits: 1,
        remainingCredits: 9,
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
      translatePromptToEnglish({
        prompt: '帮我翻译成英文',
        mode: 'text-to-video',
        locale: 'zh',
        userId: 'user-1',
      })
    ).rejects.toMatchObject({
      code: 'config_missing',
    });
  });

  it('calls openrouter with app attribution headers and fallback models', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'gen_123',
          model: 'openai/gpt-5-mini',
          choices: [
            {
              message: {
                content:
                  'A silver horse gallops through falling snow at sunrise, cinematic wide shot, cold mist, dramatic hoof impact.',
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

    const result = await translatePromptToEnglish({
      prompt: '一匹银色的马在清晨飘雪中狂奔，电影感广角，冷雾，马蹄冲击力强',
      mode: 'text-to-video',
      locale: 'zh',
      userId: 'user-1',
    });

    expect(result).toMatchObject({
      translatedPrompt:
        'A silver horse gallops through falling snow at sunrise, cinematic wide shot, cold mist, dramatic hoof impact.',
      model: 'openai/gpt-5-mini',
      requestId: 'gen_123',
      targetLanguage: 'en',
      costCredits: 1,
      remainingCredits: 9,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.executePromptToolWithCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: 'translate-prompt',
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
            id: 'gen_retry',
            model: 'google/gemini-2.5-flash',
            choices: [
              {
                message: {
                  content:
                    'High-speed vertical chase, agile fighter sprinting upward through collapsing platforms, explosive kinetic energy.',
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

    const result = await translatePromptToEnglish({
      prompt: '高速垂直追逐，灵活战士向上冲刺，平台不断坍塌，爆发式动能',
      mode: 'image-to-video',
      locale: 'zh',
      userId: 'user-2',
    });

    expect(result.model).toBe('google/gemini-2.5-flash');
    expect(result.costCredits).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
