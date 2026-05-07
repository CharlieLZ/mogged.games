import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AITaskStatus } from '@/extensions/ai/types';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  enforceApiWriteSecurity: vi.fn(),
  resolveRequestViewer: vi.fn(),
  verifyGuestTaskToken: vi.fn(),
  findGuestAITaskForViewer: vi.fn(),
  updateGuestAITaskById: vi.fn(),
  getKieImageService: vi.fn(),
  kieQuery: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/api/request-security', () => ({
  createApiPreflightResponse: vi.fn(() => new Response(null, { status: 204 })),
  enforceApiWriteSecurity: mocks.enforceApiWriteSecurity,
}));

vi.mock('@/shared/services/guest-viewer', () => ({
  resolveRequestViewer: mocks.resolveRequestViewer,
}));

vi.mock('@/shared/lib/guest-task-token', () => ({
  verifyGuestTaskToken: mocks.verifyGuestTaskToken,
}));

vi.mock('@/shared/models/guest_ai_task', () => ({
  findGuestAITaskForViewer: mocks.findGuestAITaskForViewer,
  updateGuestAITaskById: mocks.updateGuestAITaskById,
}));

vi.mock('@/shared/services/kie-image', () => ({
  getKieImageService: mocks.getKieImageService,
}));

function clearRateLimitStore() {
  (
    globalThis as typeof globalThis & {
      __imageeditoraiRateLimitStore?: { clear: () => void };
    }
  ).__imageeditoraiRateLimitStore?.clear();
}

describe('/api/ai/guest-image-query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitStore();
    mocks.enforceApiWriteSecurity.mockResolvedValue(null);
    mocks.resolveRequestViewer.mockResolvedValue({
      id: 'guest-viewer-1',
      email: '',
      name: 'Guest Viewer',
      image: null,
      isGuest: true,
      guestId: 'guest-1',
      guestIdHash: 'guest-hash-1',
      ipHash: 'ip-hash-1',
      userAgentHash: 'ua-hash-1',
      fingerprintHash: 'fp-hash-1',
    });
    mocks.verifyGuestTaskToken.mockReturnValue({
      guestIdHash: 'guest-hash-1',
      taskId: 'guest-task-1',
    });
    mocks.findGuestAITaskForViewer.mockResolvedValue({
      id: 'guest-task-1',
      guestIdHash: 'guest-hash-1',
      provider: 'kie-market',
      model: 'nano-banana-2',
      providerTaskId: 'provider-task-1',
      status: AITaskStatus.PROCESSING,
      taskInfo: null,
      taskResult: null,
      options: null,
    });
    mocks.kieQuery.mockResolvedValue({
      taskStatus: AITaskStatus.SUCCESS,
      taskInfo: {
        status: 'done',
      },
      taskResult: {
        images: ['https://cdn.example.com/guest-output.webp'],
      },
    });
    mocks.getKieImageService.mockResolvedValue({
      query: mocks.kieQuery,
    });
    mocks.updateGuestAITaskById.mockImplementation(async (_id, update) => ({
      id: 'guest-task-1',
      guestIdHash: 'guest-hash-1',
      provider: 'kie-market',
      model: 'nano-banana-2',
      providerTaskId: 'provider-task-1',
      status: update.status,
      taskInfo: update.taskInfo,
      taskResult: update.taskResult,
      options: null,
    }));
  });

  it('rejects invalid guest task tokens before querying the provider', async () => {
    mocks.verifyGuestTaskToken.mockReturnValue(null);

    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 'guest-task-1',
          taskToken: 'bad-token',
        }),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'invalid guest task token',
    });
    expect(mocks.kieQuery).not.toHaveBeenCalled();
  });

  it('queries active guest image tasks and returns updated result details', async () => {
    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 'guest-task-1',
          taskToken: 'guest-task-token-1',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.findGuestAITaskForViewer).toHaveBeenCalledWith({
      id: 'guest-task-1',
      guestIdHash: 'guest-hash-1',
    });
    expect(mocks.verifyGuestTaskToken).toHaveBeenCalledWith({
      guestIdHash: 'guest-hash-1',
      taskId: 'guest-task-1',
      token: 'guest-task-token-1',
    });
    expect(mocks.kieQuery).toHaveBeenCalledWith({
      taskId: 'provider-task-1',
      tier: 'free',
    });
    expect(mocks.updateGuestAITaskById).toHaveBeenCalledWith('guest-task-1', {
      status: AITaskStatus.SUCCESS,
      taskInfo: {
        status: 'done',
      },
      taskResult: {
        images: ['https://cdn.example.com/guest-output.webp'],
      },
    });
    expect(await response.json()).toMatchObject({
      code: 0,
      data: {
        id: 'guest-task-1',
        status: AITaskStatus.SUCCESS,
        taskInfo: {
          status: 'done',
        },
        taskResult: {
          images: ['https://cdn.example.com/guest-output.webp'],
        },
      },
    });
  });

  it('returns a sanitized 503 when guest task storage is unavailable', async () => {
    const missingTableError = Object.assign(
      new Error(
        'Failed query: select from "imageeditorai_net"."guest_ai_task"'
      ),
      {
        cause: {
          code: '42P01',
        },
      }
    );
    mocks.findGuestAITaskForViewer.mockRejectedValue(missingTableError);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 'guest-task-1',
          taskToken: 'guest-task-token-1',
        }),
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'guest image query is temporarily unavailable',
    });
    expect(mocks.kieQuery).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      '[guest-image-query] failed',
      expect.objectContaining({
        step: 'query',
        error: missingTableError,
      })
    );

    consoleError.mockRestore();
  });

  it('keeps provider failure details in the response for debugging', async () => {
    mocks.kieQuery.mockResolvedValue({
      taskStatus: AITaskStatus.FAILED,
      taskInfo: {
        errorMessage: 'provider rejected prompt',
      },
      taskResult: {
        error: 'provider rejected prompt',
      },
    });

    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 'guest-task-1',
          taskToken: 'guest-task-token-1',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      data: {
        status: AITaskStatus.FAILED,
        taskInfo: {
          errorMessage: 'provider rejected prompt',
        },
        taskResult: {
          error: 'provider rejected prompt',
        },
      },
    });
  });
});
