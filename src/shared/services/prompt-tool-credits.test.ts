import { beforeEach, describe, expect, it, vi } from 'vitest';

import { executePromptToolWithCredits } from './prompt-tool-credits';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getRemainingCredits: vi.fn(),
  consumeCredits: vi.fn(),
  claimAIGenerateIdempotency: vi.fn(),
  completeAIGenerateIdempotency: vi.fn(),
  failAIGenerateIdempotency: vi.fn(),
  claimAIGenerateMemoryIdempotency: vi.fn(),
  completeAIGenerateMemoryIdempotency: vi.fn(),
  failAIGenerateMemoryIdempotency: vi.fn(),
  createAIGenerateRequestHash: vi.fn(),
  parseAIGenerateIdempotencyResponse: vi.fn(),
}));

vi.mock('@/shared/models/credit', () => ({
  getRemainingCredits: mocks.getRemainingCredits,
  consumeCredits: mocks.consumeCredits,
}));

vi.mock('@/shared/models/ai_generate_idempotency', () => ({
  AIGenerateIdempotencyStatus: {
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  },
  claimAIGenerateIdempotency: mocks.claimAIGenerateIdempotency,
  completeAIGenerateIdempotency: mocks.completeAIGenerateIdempotency,
  failAIGenerateIdempotency: mocks.failAIGenerateIdempotency,
}));

vi.mock('@/shared/lib/ai-generate-idempotency', () => ({
  claimAIGenerateMemoryIdempotency: mocks.claimAIGenerateMemoryIdempotency,
  completeAIGenerateMemoryIdempotency:
    mocks.completeAIGenerateMemoryIdempotency,
  failAIGenerateMemoryIdempotency: mocks.failAIGenerateMemoryIdempotency,
  createAIGenerateRequestHash: mocks.createAIGenerateRequestHash,
  isAIGenerateIdempotencyStorageError: vi.fn(() => false),
  parseAIGenerateIdempotencyResponse: mocks.parseAIGenerateIdempotencyResponse,
}));

describe('prompt-tool-credits service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAIGenerateRequestHash.mockResolvedValue(
      'prompt-tool-hash-1234567890abcdef'
    );
    mocks.claimAIGenerateIdempotency.mockResolvedValue({
      kind: 'claimed',
      record: {
        id: 'idem-1',
        userId: 'user-1',
        scope: 'prompt-tool:translate-prompt',
        idempotencyKey: 'prompt-tool-hash-1234567890abcdef',
        requestHash: 'prompt-tool-hash-1234567890abcdef',
        status: 'processing',
        responsePayload: null,
        aiTaskId: null,
        errorMessage: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    mocks.completeAIGenerateIdempotency.mockResolvedValue(null);
    mocks.failAIGenerateIdempotency.mockResolvedValue(null);
    mocks.parseAIGenerateIdempotencyResponse.mockReturnValue(null);
    mocks.getRemainingCredits.mockResolvedValue(5);
    mocks.consumeCredits.mockResolvedValue({
      id: 'credit-1',
      transactionNo: 'txn-1',
    });
  });

  it('consumes credits after a successful translation request and returns the next balance', async () => {
    mocks.getRemainingCredits
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4);

    const execute = vi.fn().mockResolvedValue({
      translatedPrompt: 'A silver horse gallops through falling snow.',
      model: 'openai/gpt-5-mini',
      requestId: 'gen_123',
      targetLanguage: 'en' as const,
    });

    const result = await executePromptToolWithCredits({
      tool: 'translate-prompt',
      prompt: '一匹银色的马在雪中奔跑',
      mode: 'text-to-video',
      locale: 'zh',
      userId: 'user-1',
      execute,
    });

    expect(result).toEqual({
      translatedPrompt: 'A silver horse gallops through falling snow.',
      model: 'openai/gpt-5-mini',
      requestId: 'gen_123',
      targetLanguage: 'en',
      costCredits: 1,
      remainingCredits: 4,
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(mocks.consumeCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        credits: 1,
      })
    );
    expect(mocks.completeAIGenerateIdempotency).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        scope: 'prompt-tool:translate-prompt',
        responsePayload: expect.objectContaining({
          costCredits: 1,
          remainingCredits: 4,
        }),
      })
    );
  });

  it('returns a cached completed response without calling upstream or charging again', async () => {
    const cachedResponse = {
      rewrittenPrompt: 'A safe cinematic comedy prompt.',
      model: 'google/gemini-2.5-flash',
      requestId: 'rewrite_123',
      costCredits: 2,
      remainingCredits: 18,
    };

    mocks.claimAIGenerateIdempotency.mockResolvedValue({
      kind: 'existing',
      record: {
        id: 'idem-2',
        userId: 'user-1',
        scope: 'prompt-tool:rewrite-prompt',
        idempotencyKey: 'prompt-tool-hash-1234567890abcdef',
        requestHash: 'prompt-tool-hash-1234567890abcdef',
        status: 'completed',
        responsePayload: JSON.stringify(cachedResponse),
        aiTaskId: 'prompt_tool:rewrite-prompt:1',
        errorMessage: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    mocks.parseAIGenerateIdempotencyResponse.mockReturnValue(cachedResponse);

    const execute = vi.fn();

    const result = await executePromptToolWithCredits({
      tool: 'rewrite-prompt',
      prompt: 'unsafe prompt',
      mode: 'image-to-video',
      locale: 'en',
      userId: 'user-1',
      execute,
    });

    expect(result).toEqual(cachedResponse);
    expect(execute).not.toHaveBeenCalled();
    expect(mocks.getRemainingCredits).not.toHaveBeenCalled();
    expect(mocks.consumeCredits).not.toHaveBeenCalled();
  });

  it('fails fast on insufficient credits before the upstream request runs', async () => {
    mocks.getRemainingCredits.mockResolvedValueOnce(0);

    const execute = vi.fn();

    await expect(
      executePromptToolWithCredits({
        tool: 'translate-prompt',
        prompt: '请翻译',
        mode: 'text-to-image',
        locale: 'zh',
        userId: 'user-1',
        execute,
      })
    ).rejects.toMatchObject({
      code: 'insufficient_credits',
      status: 402,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(mocks.consumeCredits).not.toHaveBeenCalled();
    expect(mocks.failAIGenerateIdempotency).toHaveBeenCalledTimes(1);
  });
});
