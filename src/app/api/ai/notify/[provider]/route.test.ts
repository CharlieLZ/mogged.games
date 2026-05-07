import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';
import { LEGACY_AI_PROVIDER_RETIRED_CODE } from '@/shared/services/ai-legacy';

import { POST } from './route';

vi.mock('server-only', () => ({}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();

  return {
    ...actual,
    after: vi.fn(),
  };
});

const mocks = vi.hoisted(() => ({
  findAITaskByProviderTaskId: vi.fn(),
  updateAITaskById: vi.fn(),
  findUserById: vi.fn(),
  sendErrorNotification: vi.fn(),
  syncAITaskUserNotifications: vi.fn(),
  getSeedanceService: vi.fn(),
}));

vi.mock('@/shared/models/ai_task', () => ({
  findAITaskByProviderTaskId: mocks.findAITaskByProviderTaskId,
  updateAITaskById: mocks.updateAITaskById,
}));

vi.mock('@/shared/models/user', () => ({
  findUserById: mocks.findUserById,
}));

vi.mock('@/extensions/notification', () => ({
  sendErrorNotification: mocks.sendErrorNotification,
}));

vi.mock('@/shared/services/ai-task-user-notifications', () => ({
  syncAITaskUserNotifications: mocks.syncAITaskUserNotifications,
}));

vi.mock('@/shared/services/seedance', () => ({
  getSeedanceService: mocks.getSeedanceService,
}));

describe('/api/ai/notify/[provider] webhook contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSeedanceService.mockResolvedValue({
      isFallbackEnabled: vi.fn().mockReturnValue(false),
      hasFallbackAfter: vi.fn().mockReturnValue(false),
      shouldAttemptFallback: vi.fn().mockReturnValue(false),
      attachExistingTrace: vi.fn(({ nextTaskInfo }) => nextTaskInfo),
      retryWithFallback: vi.fn().mockResolvedValue(null),
      query: vi.fn(),
    });
    mocks.syncAITaskUserNotifications.mockResolvedValue(undefined);
  });

  it('ignores late webhooks for retired legacy tasks', async () => {
    mocks.findAITaskByProviderTaskId.mockResolvedValue({
      id: 'task-1',
      provider: 'studio',
      taskId: 'provider-task-1',
      status: AITaskStatus.FAILED,
      taskInfo: JSON.stringify({
        errorCode: LEGACY_AI_PROVIDER_RETIRED_CODE,
      }),
      taskResult: JSON.stringify({
        code: LEGACY_AI_PROVIDER_RETIRED_CODE,
        legacyProviderRetired: true,
      }),
    });

    const response = await POST(
      new Request('https://example.com/api/ai/notify/studio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 'provider-task-1',
          status: 'success',
          output: ['https://cdn.example.com/output.mp4'],
        }),
      }),
      {
        params: Promise.resolve({
          provider: 'studio',
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      data: {
        ignored: true,
        reason: 'legacy_provider_retired',
      },
    });
    expect(mocks.updateAITaskById).not.toHaveBeenCalled();
    expect(mocks.getSeedanceService).not.toHaveBeenCalled();
  });

  it('does not let a late failed webhook overwrite an already successful task', async () => {
    mocks.findAITaskByProviderTaskId.mockResolvedValue({
      id: 'task-2',
      provider: 'fal',
      model: 'seedance-2.0',
      taskId: 'provider-task-2',
      status: AITaskStatus.SUCCESS,
      taskInfo: {
        status: 'success',
      },
      taskResult: {
        videos: ['https://cdn.example.com/final.mp4'],
      },
    });

    const response = await POST(
      new Request('https://example.com/api/ai/notify/fal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 'provider-task-2',
          status: 'failed',
          error: 'provider timeout',
        }),
      }),
      {
        params: Promise.resolve({
          provider: 'fal',
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      data: {
        provider: 'fal',
        task_id: 'provider-task-2',
      },
    });
    expect(mocks.updateAITaskById).not.toHaveBeenCalled();
  });

  it('stores video outputs as videos during the fast webhook fallback update', async () => {
    mocks.findAITaskByProviderTaskId.mockResolvedValue({
      id: 'task-3',
      provider: 'fal',
      model: 'seedance-2.0',
      taskId: 'provider-task-3',
      status: AITaskStatus.PROCESSING,
      taskInfo: null,
      taskResult: null,
    });

    const response = await POST(
      new Request('https://example.com/api/ai/notify/fal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 'provider-task-3',
          status: 'success',
          output: ['https://cdn.example.com/output.mp4'],
        }),
      }),
      {
        params: Promise.resolve({
          provider: 'fal',
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.updateAITaskById).toHaveBeenCalledWith(
      'task-3',
      expect.objectContaining({
        status: AITaskStatus.SUCCESS,
        taskInfo: expect.objectContaining({
          status: 'success',
          videos: [{ videoUrl: 'https://cdn.example.com/output.mp4' }],
        }),
      })
    );
  });

  it('stores official volcengine callback content during the fast webhook fallback update', async () => {
    mocks.findAITaskByProviderTaskId.mockResolvedValue({
      id: 'task-4',
      provider: 'volcengine',
      model: 'doubao-seedance-2-0-fast-260128',
      taskId: 'cgt-123',
      status: AITaskStatus.PROCESSING,
      taskInfo: null,
      taskResult: null,
    });

    const response = await POST(
      new Request('https://example.com/api/ai/notify/volcengine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 'cgt-123',
          status: 'succeeded',
          content: {
            video_url: 'https://cdn.example.com/output.mp4',
            last_frame_url: 'https://cdn.example.com/output-last-frame.png',
          },
        }),
      }),
      {
        params: Promise.resolve({
          provider: 'volcengine',
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.updateAITaskById).toHaveBeenCalledWith(
      'task-4',
      expect.objectContaining({
        status: AITaskStatus.SUCCESS,
        taskInfo: expect.objectContaining({
          status: 'succeeded',
          videos: [{ videoUrl: 'https://cdn.example.com/output.mp4' }],
          images: [
            { imageUrl: 'https://cdn.example.com/output-last-frame.png' },
          ],
        }),
        taskResult: expect.objectContaining({
          content: expect.objectContaining({
            video_url: 'https://cdn.example.com/output.mp4',
            last_frame_url: 'https://cdn.example.com/output-last-frame.png',
          }),
        }),
      })
    );
  });

  it('preserves existing seedance trace during the fast webhook fallback update', async () => {
    const attachExistingTrace = vi.fn(({ nextTaskInfo }) => ({
      ...nextTaskInfo,
      seedance: {
        requestedProvider: 'seedance',
        requestedModel: 'seedance-2.0-fast',
        scene: 'text-to-video',
        fast: true,
        routingMode: 'single',
        activeProvider: 'volcengine',
        activeModel: 'doubao-seedance-2-0-fast-260128',
        attempts: [],
        updatedAt: '2026-04-15T00:00:00.000Z',
      },
    }));

    mocks.getSeedanceService.mockResolvedValue({
      isFallbackEnabled: vi.fn().mockReturnValue(false),
      hasFallbackAfter: vi.fn().mockReturnValue(false),
      shouldAttemptFallback: vi.fn().mockReturnValue(false),
      attachExistingTrace,
      retryWithFallback: vi.fn().mockResolvedValue(null),
      query: vi.fn(),
    });

    mocks.findAITaskByProviderTaskId.mockResolvedValue({
      id: 'task-4b',
      provider: 'volcengine',
      model: 'doubao-seedance-2-0-fast-260128',
      taskId: 'cgt-124',
      status: AITaskStatus.PROCESSING,
      taskInfo: {
        seedance: {
          requestedProvider: 'seedance',
          requestedModel: 'seedance-2.0-fast',
          scene: 'text-to-video',
          fast: true,
          routingMode: 'single',
          activeProvider: 'volcengine',
          activeModel: 'doubao-seedance-2-0-fast-260128',
          attempts: [],
          updatedAt: '2026-04-14T00:00:00.000Z',
        },
      },
      taskResult: null,
    });

    const response = await POST(
      new Request('https://example.com/api/ai/notify/volcengine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 'cgt-124',
          status: 'succeeded',
          content: {
            video_url: 'https://cdn.example.com/output.mp4',
          },
        }),
      }),
      {
        params: Promise.resolve({
          provider: 'volcengine',
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(attachExistingTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        taskInfo: expect.objectContaining({
          seedance: expect.objectContaining({
            requestedProvider: 'seedance',
            requestedModel: 'seedance-2.0-fast',
          }),
        }),
        nextTaskInfo: expect.objectContaining({
          status: 'succeeded',
          videos: [{ videoUrl: 'https://cdn.example.com/output.mp4' }],
        }),
      })
    );
    expect(mocks.updateAITaskById).toHaveBeenCalledWith(
      'task-4b',
      expect.objectContaining({
        status: AITaskStatus.SUCCESS,
        taskInfo: expect.objectContaining({
          status: 'succeeded',
          videos: [{ videoUrl: 'https://cdn.example.com/output.mp4' }],
          seedance: expect.objectContaining({
            requestedProvider: 'seedance',
            requestedModel: 'seedance-2.0-fast',
            activeProvider: 'volcengine',
          }),
        }),
      })
    );
  });

  it('persists terminal safety failures immediately when fallback policy blocks provider hopping', async () => {
    mocks.findAITaskByProviderTaskId.mockResolvedValue({
      id: 'task-5',
      userId: 'user-1',
      provider: 'volcengine',
      model: 'doubao-seedance-2-0-fast-260128',
      taskId: 'cgt-456',
      prompt: 'unsafe prompt',
      scene: 'text-to-video',
      options: { fast: true },
      status: AITaskStatus.PROCESSING,
      taskInfo: null,
      taskResult: null,
    });
    mocks.getSeedanceService.mockResolvedValue({
      isFallbackEnabled: vi.fn().mockReturnValue(true),
      hasFallbackAfter: vi.fn().mockReturnValue(true),
      shouldAttemptFallback: vi.fn().mockReturnValue(false),
      attachExistingTrace: vi.fn(({ nextTaskInfo }) => nextTaskInfo),
      retryWithFallback: vi.fn().mockResolvedValue(null),
      query: vi.fn(),
    });

    const response = await POST(
      new Request('https://example.com/api/ai/notify/volcengine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 'cgt-456',
          status: 'failed',
          error:
            'The request failed because the output video may contain sensitive information.',
        }),
      }),
      {
        params: Promise.resolve({
          provider: 'volcengine',
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.updateAITaskById).toHaveBeenCalledWith(
      'task-5',
      expect.objectContaining({
        status: AITaskStatus.FAILED,
        taskInfo: expect.objectContaining({
          status: 'failed',
          errorMessage:
            'The request failed because the output video may contain sensitive information.',
        }),
      })
    );
  });
});
