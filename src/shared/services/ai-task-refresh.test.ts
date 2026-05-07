import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';
import { findAITaskById, updateAITaskById } from '@/shared/models/ai_task';
import { LEGACY_AI_PROVIDER_RETIRED_CODE } from '@/shared/services/ai-legacy';

import { refreshAITasksBatch } from './ai-task-refresh';
import { getKieImageService } from './kie-image';
import { getSeedanceService } from './seedance';
import { syncAITaskUserNotifications } from './ai-task-user-notifications';

vi.mock('server-only', () => ({}));

vi.mock('./seedance', () => ({
  getSeedanceService: vi.fn(),
}));

vi.mock('./kie-image', () => ({
  getKieImageService: vi.fn(),
}));

vi.mock('./ai-task-user-notifications', () => ({
  syncAITaskUserNotifications: vi.fn(),
}));

vi.mock('@/shared/models/ai_task', () => ({
  findAITaskById: vi.fn(),
  updateAITaskById: vi.fn(),
}));

describe('ai task refresh', () => {
  beforeEach(() => {
    vi.mocked(findAITaskById).mockReset();
    vi.mocked(updateAITaskById).mockReset();
    vi.mocked(getSeedanceService).mockReset();
    vi.mocked(getKieImageService).mockReset();
    vi.mocked(syncAITaskUserNotifications).mockReset();
  });

  it('dedupes task ids and persists status changes for seedance tasks', async () => {
    const query = vi.fn().mockResolvedValue({
      taskStatus: AITaskStatus.SUCCESS,
      taskInfo: { status: 'done' },
      taskResult: { url: 'https://example.com/file.mp4' },
    });

    vi.mocked(getSeedanceService).mockResolvedValue({
      query,
      attachExistingTrace: vi.fn(({ nextTaskInfo }) => nextTaskInfo),
      retryWithFallback: vi.fn().mockResolvedValue(null),
    } as never);

    vi.mocked(findAITaskById).mockResolvedValue({
      id: 'task-1',
      taskId: 'provider-task-1',
      provider: 'apixo',
      status: AITaskStatus.PROCESSING,
      model: 'seedance-2.0',
      creditId: 'credit-1',
    } as never);

    const result = await refreshAITasksBatch({
      taskIds: ['task-1', 'task-1'],
      loggerLabel: 'test',
    });

    expect(findAITaskById).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
    expect(updateAITaskById).toHaveBeenCalledWith('task-1', {
      status: AITaskStatus.SUCCESS,
      taskInfo: { status: 'done' },
      taskResult: { url: 'https://example.com/file.mp4' },
      creditId: 'credit-1',
    });
    expect(syncAITaskUserNotifications).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: 'task-1',
        status: AITaskStatus.SUCCESS,
      }),
    });
    expect(result).toEqual({
      results: [
        {
          id: 'task-1',
          status: AITaskStatus.SUCCESS,
          changed: true,
        },
      ],
      hasAnyChange: true,
      refreshedCount: 1,
      totalCount: 1,
    });
  });

  it('persists fresh task payloads even when provider status stays the same', async () => {
    const query = vi.fn().mockResolvedValue({
      taskStatus: AITaskStatus.PROCESSING,
      taskInfo: { status: 'processing', queuePosition: 2 },
      taskResult: null,
    });

    vi.mocked(getSeedanceService).mockResolvedValue({
      query,
      attachExistingTrace: vi.fn(({ nextTaskInfo }) => nextTaskInfo),
      retryWithFallback: vi.fn().mockResolvedValue(null),
    } as never);

    vi.mocked(findAITaskById).mockResolvedValue({
      id: 'task-1',
      taskId: 'provider-task-1',
      provider: 'apixo',
      status: AITaskStatus.PROCESSING,
      model: 'seedance-2.0',
      taskInfo: { status: 'processing', queuePosition: 5 },
      taskResult: null,
      creditId: 'credit-1',
    } as never);

    const result = await refreshAITasksBatch({
      taskIds: ['task-1'],
      loggerLabel: 'test',
    });

    expect(updateAITaskById).toHaveBeenCalledWith('task-1', {
      status: AITaskStatus.PROCESSING,
      taskInfo: { status: 'processing', queuePosition: 2 },
      taskResult: null,
      creditId: 'credit-1',
    });
    expect(result).toEqual({
      results: [
        {
          id: 'task-1',
          status: AITaskStatus.PROCESSING,
          changed: true,
        },
      ],
      hasAnyChange: true,
      refreshedCount: 1,
      totalCount: 1,
    });
  });

  it('retires active legacy-provider tasks during refresh', async () => {
    vi.mocked(getSeedanceService).mockResolvedValue({
      query: vi.fn(),
      attachExistingTrace: vi.fn(({ nextTaskInfo }) => nextTaskInfo),
      retryWithFallback: vi.fn().mockResolvedValue(null),
    } as never);

    vi.mocked(findAITaskById).mockResolvedValue({
      id: 'task-2',
      taskId: 'provider-task-2',
      provider: 'studio',
      status: AITaskStatus.PENDING,
      model: 'legacy-model',
      creditId: 'credit-2',
    } as never);

    const result = await refreshAITasksBatch({
      taskIds: ['task-2'],
      loggerLabel: 'test',
    });

    expect(updateAITaskById).toHaveBeenCalledWith(
      'task-2',
      expect.objectContaining({
        status: AITaskStatus.FAILED,
        taskInfo: expect.objectContaining({
          errorCode: LEGACY_AI_PROVIDER_RETIRED_CODE,
        }),
        taskResult: expect.objectContaining({
          code: LEGACY_AI_PROVIDER_RETIRED_CODE,
        }),
        creditId: 'credit-2',
      })
    );
    expect(result).toEqual({
      results: [
        {
          id: 'task-2',
          status: AITaskStatus.FAILED,
          changed: true,
        },
      ],
      hasAnyChange: true,
      refreshedCount: 1,
      totalCount: 1,
    });
  });

  it('queries active kie-market image tasks without sending them through seedance retirement logic', async () => {
    vi.mocked(getKieImageService).mockResolvedValue({
      query: vi.fn().mockResolvedValue({
        taskStatus: AITaskStatus.SUCCESS,
        taskInfo: {
          status: 'success',
          images: [
            {
              id: 'kie-task-1-0',
              imageUrl: 'https://cdn.example.com/output.png',
            },
          ],
        },
        taskResult: {
          images: ['https://cdn.example.com/output.png'],
        },
      }),
    } as never);

    vi.mocked(findAITaskById).mockResolvedValue({
      id: 'task-3',
      taskId: 'kie-task-1',
      provider: 'kie-market',
      status: AITaskStatus.PROCESSING,
      model: 'nano-banana-2',
      creditId: 'credit-3',
      taskInfo: null,
      taskResult: null,
    } as never);

    const result = await refreshAITasksBatch({
      taskIds: ['task-3'],
      loggerLabel: 'test',
    });

    expect(getSeedanceService).not.toHaveBeenCalled();
    expect(updateAITaskById).toHaveBeenCalledWith('task-3', {
      status: AITaskStatus.SUCCESS,
      taskInfo: {
        status: 'success',
        images: [
          {
            id: 'kie-task-1-0',
            imageUrl: 'https://cdn.example.com/output.png',
          },
        ],
      },
      taskResult: {
        images: ['https://cdn.example.com/output.png'],
      },
      creditId: 'credit-3',
    });
    expect(result).toEqual({
      results: [
        {
          id: 'task-3',
          status: AITaskStatus.SUCCESS,
          changed: true,
        },
      ],
      hasAnyChange: true,
      refreshedCount: 1,
      totalCount: 1,
    });
  });

  it('returns denied status without querying providers when access fails', async () => {
    const query = vi.fn();

    vi.mocked(getSeedanceService).mockResolvedValue({
      query,
      attachExistingTrace: vi.fn(({ nextTaskInfo }) => nextTaskInfo),
      retryWithFallback: vi.fn().mockResolvedValue(null),
    } as never);

    vi.mocked(findAITaskById).mockResolvedValue({
      id: 'task-3',
      taskId: 'provider-task-3',
      provider: 'apixo',
      status: AITaskStatus.PENDING,
    } as never);

    const result = await refreshAITasksBatch({
      taskIds: ['task-3'],
      canAccessTask: async () => false,
      loggerLabel: 'test',
    });

    expect(query).not.toHaveBeenCalled();
    expect(updateAITaskById).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          id: 'task-3',
          status: 'no_permission',
          changed: false,
        },
      ],
      hasAnyChange: false,
      refreshedCount: 0,
      totalCount: 1,
    });
  });
});
