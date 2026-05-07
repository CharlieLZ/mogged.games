import { describe, expect, it } from 'vitest';

import {
  claimAIGenerateMemoryIdempotency,
  completeAIGenerateMemoryIdempotency,
  createAIGenerateRequestHash,
  failAIGenerateMemoryIdempotency,
  normalizeAIGenerateIdempotencyKey,
  parseAIGenerateIdempotencyResponse,
} from '@/shared/lib/ai-generate-idempotency';

describe('ai generate idempotency helpers', () => {
  it('normalizes supported idempotency keys', () => {
    expect(normalizeAIGenerateIdempotencyKey('  aigen_key_12345  ')).toBe(
      'aigen_key_12345'
    );
    expect(normalizeAIGenerateIdempotencyKey('short')).toBeNull();
  });

  it('builds a stable request hash for equivalent payloads', async () => {
    const left = await createAIGenerateRequestHash({
      provider: 'fal',
      mediaType: 'image',
      model: 'test-model',
      prompt: 'hello',
      options: {
        image_size: 'square_hd',
        seed: 42,
      },
    });
    const right = await createAIGenerateRequestHash({
      prompt: 'hello',
      model: 'test-model',
      options: {
        seed: 42,
        image_size: 'square_hd',
      },
      provider: 'fal',
      mediaType: 'image',
    });

    expect(left).toBe(right);
  });

  it('parses stored response payload safely', () => {
    expect(
      parseAIGenerateIdempotencyResponse(JSON.stringify({ taskId: 'task_123' }))
    ).toEqual({ taskId: 'task_123' });
    expect(parseAIGenerateIdempotencyResponse('invalid-json')).toBeNull();
  });

  it('tracks processing, completion, and failure states in memory fallback storage', () => {
    const claimed = claimAIGenerateMemoryIdempotency({
      userId: 'user-1',
      scope: 'ai-generate',
      idempotencyKey: 'memory-key-123',
      requestHash: 'hash-1',
    });

    expect(claimed.kind).toBe('claimed');

    const duplicateWhileProcessing = claimAIGenerateMemoryIdempotency({
      userId: 'user-1',
      scope: 'ai-generate',
      idempotencyKey: 'memory-key-123',
      requestHash: 'hash-1',
    });

    expect(duplicateWhileProcessing).toMatchObject({
      kind: 'existing',
      record: {
        status: 'processing',
        requestHash: 'hash-1',
      },
    });

    completeAIGenerateMemoryIdempotency({
      userId: 'user-1',
      scope: 'ai-generate',
      idempotencyKey: 'memory-key-123',
      responsePayload: { taskId: 'task-1' },
    });

    const completed = claimAIGenerateMemoryIdempotency({
      userId: 'user-1',
      scope: 'ai-generate',
      idempotencyKey: 'memory-key-123',
      requestHash: 'hash-1',
    });

    expect(completed).toMatchObject({
      kind: 'existing',
      record: {
        status: 'completed',
        responsePayload: {
          taskId: 'task-1',
        },
      },
    });

    failAIGenerateMemoryIdempotency({
      userId: 'user-1',
      scope: 'ai-generate',
      idempotencyKey: 'memory-key-456',
      errorMessage: 'upstream failed',
    });

    const failed = claimAIGenerateMemoryIdempotency({
      userId: 'user-1',
      scope: 'ai-generate',
      idempotencyKey: 'memory-key-456',
      requestHash: 'hash-2',
    });

    expect(failed).toMatchObject({
      kind: 'existing',
      record: {
        status: 'failed',
        errorMessage: 'upstream failed',
      },
    });
  });
});
