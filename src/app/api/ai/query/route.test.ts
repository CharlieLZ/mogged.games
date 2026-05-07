import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';
import { LEGACY_AI_PROVIDER_RETIRED_CODE } from '@/shared/services/ai-legacy';

import { POST } from './route';

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();

  return {
    ...actual,
    after: vi.fn((callback: () => unknown) => callback()),
  };
});

const mocks = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  findAITaskById: vi.fn(),
  updateAITaskById: vi.fn(),
  sendErrorNotification: vi.fn(),
  syncAITaskUserNotifications: vi.fn(),
  getSeedanceService: vi.fn(),
  getKieImageService: vi.fn(),
  kieImageQuery: vi.fn(),
  resolveRequestContext: vi.fn(),
  getClientIpFromHeaders: vi.fn(),
  recordFirstSuccessfulGeneration: vi.fn(),
}));

vi.mock('@/extensions/notification', () => ({
  sendErrorNotification: mocks.sendErrorNotification,
}));

vi.mock('@/shared/services/ai-task-user-notifications', () => ({
  syncAITaskUserNotifications: mocks.syncAITaskUserNotifications,
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: mocks.getUserInfo,
}));

vi.mock('@/shared/models/ai_task', () => ({
  findAITaskById: mocks.findAITaskById,
  updateAITaskById: mocks.updateAITaskById,
}));

vi.mock('@/shared/services/seedance', () => ({
  getSeedanceService: mocks.getSeedanceService,
}));

vi.mock('@/shared/services/kie-image', () => ({
  getKieImageService: mocks.getKieImageService,
}));

vi.mock('@/shared/lib/request-context', () => ({
  resolveRequestContext: mocks.resolveRequestContext,
  getClientIpFromHeaders: mocks.getClientIpFromHeaders,
}));

vi.mock('@/shared/services/funnel-observability', () => ({
  recordFirstSuccessfulGeneration: mocks.recordFirstSuccessfulGeneration,
}));

vi.mock('@/shared/models/subscription', () => ({
  getCurrentSubscription: vi.fn().mockResolvedValue(null),
}));

describe('/api/ai/query contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
    });
    mocks.updateAITaskById.mockResolvedValue(null);
    mocks.sendErrorNotification.mockResolvedValue({ ok: true });
    mocks.syncAITaskUserNotifications.mockResolvedValue(undefined);
    mocks.getSeedanceService.mockResolvedValue({
      query: vi.fn(),
      attachExistingTrace: vi.fn(
        ({ nextTaskInfo }: { nextTaskInfo: unknown }) => nextTaskInfo
      ),
      retryWithFallback: vi.fn().mockResolvedValue(null),
    });
    mocks.kieImageQuery.mockResolvedValue({
      taskStatus: AITaskStatus.SUCCESS,
      taskInfo: {
        images: [
          {
            id: 'kie-task-1-0',
            imageUrl: 'https://cdn.example.com/output.png',
          },
        ],
        status: 'success',
      },
      taskResult: {
        images: ['https://cdn.example.com/output.png'],
      },
    });
    mocks.getKieImageService.mockResolvedValue({
      query: mocks.kieImageQuery,
    });
    mocks.resolveRequestContext.mockReturnValue({
      path: '/api/ai/query',
      deviceType: 'desktop',
      locale: 'en',
    });
    mocks.getClientIpFromHeaders.mockReturnValue('1.2.3.4');
    mocks.recordFirstSuccessfulGeneration.mockResolvedValue('recorded');
  });

  it('rejects requests without taskId', async () => {
    const response = await POST(
      new Request('https://example.com/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'invalid params',
    });
    expect(mocks.findAITaskById).not.toHaveBeenCalled();
  });

  it('rejects cross-user task queries', async () => {
    mocks.findAITaskById.mockResolvedValue({
      id: 'task-1',
      taskId: 'provider-task-1',
      userId: 'user-2',
      provider: 'studio',
    });

    const response = await POST(
      new Request('https://example.com/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 'task-1',
        }),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'no permission',
    });
    expect(mocks.getSeedanceService).not.toHaveBeenCalled();
  });

  it('retires active legacy-provider tasks instead of querying old runtimes', async () => {
    mocks.findAITaskById.mockResolvedValue({
      id: 'task-1',
      taskId: 'provider-task-1',
      userId: 'user-1',
      provider: 'studio',
      model: 'legacy-model',
      prompt: 'golden hour skyline',
      scene: 'text-to-image',
      mediaType: 'image',
      options: null,
      status: AITaskStatus.PROCESSING,
      taskInfo: null,
      taskResult: null,
      creditId: 'credit-1',
    });
    mocks.updateAITaskById.mockResolvedValue({
      id: 'task-1',
      taskId: 'provider-task-1',
      userId: 'user-1',
      provider: 'studio',
      model: 'legacy-model',
      prompt: 'golden hour skyline',
      scene: 'text-to-image',
      mediaType: 'image',
      options: null,
      status: AITaskStatus.FAILED,
      taskInfo: JSON.stringify({
        errorCode: LEGACY_AI_PROVIDER_RETIRED_CODE,
      }),
      taskResult: JSON.stringify({
        code: LEGACY_AI_PROVIDER_RETIRED_CODE,
      }),
      creditId: 'credit-1',
    });

    const response = await POST(
      new Request('https://example.com/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 'task-1',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      data: {
        id: 'task-1',
        status: AITaskStatus.FAILED,
        taskInfo: expect.objectContaining({
          errorCode: LEGACY_AI_PROVIDER_RETIRED_CODE,
        }),
        taskResult: expect.objectContaining({
          code: LEGACY_AI_PROVIDER_RETIRED_CODE,
        }),
      },
    });
    expect(mocks.getSeedanceService).not.toHaveBeenCalled();
  });

  it('returns the updated task envelope after a successful seedance query', async () => {
    const query = vi.fn().mockResolvedValue({
      taskStatus: AITaskStatus.SUCCESS,
      taskInfo: {
        status: 'done',
      },
      taskResult: {
        videos: ['https://cdn.example.com/output.mp4'],
      },
    });
    const attachExistingTrace = vi.fn(
      ({ nextTaskInfo }: { nextTaskInfo: unknown }) => nextTaskInfo
    );

    mocks.findAITaskById.mockResolvedValue({
      id: 'task-1',
      taskId: 'provider-task-1',
      userId: 'user-1',
      provider: 'apixo',
      model: 'seedance',
      prompt: 'golden hour skyline',
      scene: 'text-to-video',
      mediaType: 'video',
      options: null,
      status: AITaskStatus.PROCESSING,
      taskInfo: null,
      taskResult: null,
      creditId: 'credit-1',
    });
    mocks.getSeedanceService.mockResolvedValue({
      query,
      attachExistingTrace,
      retryWithFallback: vi.fn().mockResolvedValue(null),
    });

    const response = await POST(
      new Request('https://example.com/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 'task-1',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        id: 'task-1',
        taskId: 'provider-task-1',
        userId: 'user-1',
        provider: 'apixo',
        model: 'seedance',
        prompt: 'golden hour skyline',
        scene: 'text-to-video',
        mediaType: 'video',
        options: null,
        status: AITaskStatus.SUCCESS,
        taskInfo: {
          status: 'done',
        },
        taskResult: {
          videos: ['https://cdn.example.com/output.mp4'],
        },
        creditId: 'credit-1',
      },
    });

    expect(query).toHaveBeenCalledWith({
      taskId: 'provider-task-1',
      model: 'seedance',
      provider: 'apixo',
    });
    expect(mocks.updateAITaskById).toHaveBeenCalledWith('task-1', {
      status: AITaskStatus.SUCCESS,
      taskInfo: {
        status: 'done',
      },
      taskResult: {
        videos: ['https://cdn.example.com/output.mp4'],
      },
      creditId: 'credit-1',
    });
    expect(mocks.recordFirstSuccessfulGeneration).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: 'task-1',
        userId: 'user-1',
        status: AITaskStatus.SUCCESS,
      }),
      source: 'query',
      requestContext: expect.objectContaining({
        path: '/api/ai/query',
        deviceType: 'desktop',
        locale: 'en',
      }),
    });
    expect(mocks.syncAITaskUserNotifications).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: 'task-1',
        status: AITaskStatus.SUCCESS,
      }),
      user: expect.objectContaining({
        id: 'user-1',
        email: 'demo@example.com',
      }),
    });
  });

  it('queries kie-market image tasks through the active image provider chain', async () => {
    mocks.findAITaskById.mockResolvedValue({
      id: 'task-1',
      taskId: 'kie-task-1',
      userId: 'user-1',
      provider: 'kie-market',
      model: 'nano-banana-2',
      prompt: 'premium skincare still life',
      scene: 'text-to-image',
      mediaType: 'image',
      options: null,
      status: AITaskStatus.PROCESSING,
      taskInfo: null,
      taskResult: null,
      creditId: 'credit-1',
    });

    const response = await POST(
      new Request('https://example.com/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 'task-1',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        id: 'task-1',
        taskId: 'kie-task-1',
        userId: 'user-1',
        provider: 'kie-market',
        model: 'nano-banana-2',
        prompt: 'premium skincare still life',
        scene: 'text-to-image',
        mediaType: 'image',
        options: null,
        status: AITaskStatus.SUCCESS,
        taskInfo: {
          images: [
            {
              id: 'kie-task-1-0',
              imageUrl: 'https://cdn.example.com/output.png',
            },
          ],
          status: 'success',
        },
        taskResult: {
          images: ['https://cdn.example.com/output.png'],
        },
        creditId: 'credit-1',
      },
    });
    expect(mocks.getKieImageService).toHaveBeenCalledTimes(1);
    expect(mocks.kieImageQuery).toHaveBeenCalledWith({
      taskId: 'kie-task-1',
      tier: 'free',
    });
    expect(mocks.getSeedanceService).not.toHaveBeenCalled();
    expect(mocks.updateAITaskById).toHaveBeenCalledWith('task-1', {
      status: AITaskStatus.SUCCESS,
      taskInfo: {
        images: [
          {
            id: 'kie-task-1-0',
            imageUrl: 'https://cdn.example.com/output.png',
          },
        ],
        status: 'success',
      },
      taskResult: {
        images: ['https://cdn.example.com/output.png'],
      },
      creditId: 'credit-1',
    });
  });
});
