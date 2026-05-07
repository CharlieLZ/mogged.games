import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';
import {
  hasUserContextEventByType,
  safeRecordUserContextEvent,
} from '@/shared/models/user_context_event';

import {
  FIRST_SUCCESSFUL_GENERATION_EVENT,
  recordFirstSuccessfulGeneration,
} from './funnel-observability';

vi.mock('@/shared/models/user_context_event', () => ({
  hasUserContextEventByType: vi.fn(),
  safeRecordUserContextEvent: vi.fn(),
}));

describe('funnel observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasUserContextEventByType).mockResolvedValue(false);
    vi.mocked(safeRecordUserContextEvent).mockResolvedValue(null);
  });

  it('records the first successful generation once per user', async () => {
    const result = await recordFirstSuccessfulGeneration({
      task: {
        id: 'task-1',
        userId: 'user-1',
        status: AITaskStatus.SUCCESS,
        provider: 'apixo',
        model: 'seedance-2.0-fast',
        scene: 'text-to-video',
        mediaType: 'video',
      },
      source: 'query',
      requestContext: {
        deviceType: 'desktop',
        locale: 'en',
        path: '/api/ai/query',
      },
    });

    expect(result).toBe('recorded');
    expect(hasUserContextEventByType).toHaveBeenCalledWith(
      'user-1',
      FIRST_SUCCESSFUL_GENERATION_EVENT
    );
    expect(safeRecordUserContextEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        eventType: FIRST_SUCCESSFUL_GENERATION_EVENT,
        deviceType: 'desktop',
        locale: 'en',
        path: '/api/ai/query',
        metadata: expect.objectContaining({
          taskId: 'task-1',
          provider: 'apixo',
          model: 'seedance-2.0-fast',
          scene: 'text-to-video',
          mediaType: 'video',
          source: 'query',
        }),
      })
    );
  });

  it('skips duplicate first-success events for the same user', async () => {
    vi.mocked(hasUserContextEventByType).mockResolvedValue(true);

    const result = await recordFirstSuccessfulGeneration({
      task: {
        id: 'task-1',
        userId: 'user-1',
        status: AITaskStatus.SUCCESS,
      },
      source: 'notify',
    });

    expect(result).toBe('already-recorded');
    expect(safeRecordUserContextEvent).not.toHaveBeenCalled();
  });

  it('skips tasks that have not reached success', async () => {
    const result = await recordFirstSuccessfulGeneration({
      task: {
        id: 'task-1',
        userId: 'user-1',
        status: AITaskStatus.PROCESSING,
      },
      source: 'generate',
    });

    expect(result).toBe('skipped');
    expect(hasUserContextEventByType).not.toHaveBeenCalled();
    expect(safeRecordUserContextEvent).not.toHaveBeenCalled();
  });
});
