import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  enforceApiWriteSecurity: vi.fn(),
  resolveRequestGuestViewer: vi.fn(),
  reserveGuestDailyQuota: vi.fn(),
  consumeGuestDailyQuotaReservation: vi.fn(),
  releaseGuestDailyQuotaReservation: vi.fn(),
  getKieImageService: vi.fn(),
  kieGenerate: vi.fn(),
  createGuestAITask: vi.fn(),
  createGuestTaskToken: vi.fn(),
  findAIModelRule: vi.fn(),
  getRequestedModelForScene: vi.fn(),
  isGuestAllowedAIModel: vi.fn(),
  getFirstImageUrl: vi.fn(),
  resolveKieMarketAspectRatio: vi.fn(),
  resolveKieMarketOutputFormat: vi.fn(),
  getUuid: vi.fn(),
  normalizeAIGenerateIdempotencyKey: vi.fn(),
  createAIGenerateRequestHash: vi.fn(),
  claimAIGenerateMemoryIdempotency: vi.fn(),
  completeAIGenerateMemoryIdempotency: vi.fn(),
  failAIGenerateMemoryIdempotency: vi.fn(),
  notifyGuestCreditsConsumed: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/api/request-security', () => ({
  createApiPreflightResponse: vi.fn(() => new Response(null, { status: 204 })),
  enforceApiWriteSecurity: mocks.enforceApiWriteSecurity,
}));

vi.mock('@/shared/services/guest-viewer', () => ({
  resolveRequestGuestViewer: mocks.resolveRequestGuestViewer,
}));

vi.mock('@/shared/services/guest-daily-quota', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/services/guest-daily-quota')>();

  return {
    ...actual,
    reserveGuestDailyQuota: mocks.reserveGuestDailyQuota,
    consumeGuestDailyQuotaReservation: mocks.consumeGuestDailyQuotaReservation,
    releaseGuestDailyQuotaReservation: mocks.releaseGuestDailyQuotaReservation,
  };
});

vi.mock('@/shared/services/kie-image', () => ({
  getKieImageService: mocks.getKieImageService,
}));

vi.mock('@/shared/services/guest-cost-notification', () => ({
  notifyGuestCreditsConsumed: mocks.notifyGuestCreditsConsumed,
}));

vi.mock('@/shared/models/guest_ai_task', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/models/guest_ai_task')>();

  return {
    ...actual,
    createGuestAITask: mocks.createGuestAITask,
  };
});

vi.mock('@/shared/lib/guest-task-token', () => ({
  createGuestTaskToken: mocks.createGuestTaskToken,
}));

vi.mock('@/shared/lib/hash', () => ({
  getUuid: mocks.getUuid,
}));

vi.mock('@/shared/lib/ai-generate-idempotency', () => ({
  normalizeAIGenerateIdempotencyKey: mocks.normalizeAIGenerateIdempotencyKey,
  createAIGenerateRequestHash: mocks.createAIGenerateRequestHash,
  claimAIGenerateMemoryIdempotency: mocks.claimAIGenerateMemoryIdempotency,
  completeAIGenerateMemoryIdempotency:
    mocks.completeAIGenerateMemoryIdempotency,
  failAIGenerateMemoryIdempotency: mocks.failAIGenerateMemoryIdempotency,
}));

vi.mock('@/config/ai-model-registry', () => ({
  findAIModelRule: mocks.findAIModelRule,
  getAIGenerationCostCredits: vi.fn(() => 12),
  getGuestRequestedModelForScene: mocks.getRequestedModelForScene,
  getRequestedModelForScene: mocks.getRequestedModelForScene,
  isGuestAllowedAIModel: mocks.isGuestAllowedAIModel,
}));

vi.mock('@/extensions/ai/provider-utils', () => ({
  getFirstImageUrl: mocks.getFirstImageUrl,
  resolveKieMarketAspectRatio: mocks.resolveKieMarketAspectRatio,
  resolveKieMarketOutputFormat: mocks.resolveKieMarketOutputFormat,
}));

let guestRequestCounter = 0;

function clearRateLimitStore() {
  (
    globalThis as typeof globalThis & {
      __mogged_gamesRateLimitStore?: { clear: () => void };
    }
  ).__mogged_gamesRateLimitStore?.clear();
}

describe('/api/ai/guest-image-generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitStore();
    guestRequestCounter += 1;
    mocks.enforceApiWriteSecurity.mockResolvedValue(null);
    mocks.resolveRequestGuestViewer.mockResolvedValue({
      id: `guest-viewer-${guestRequestCounter}`,
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
    mocks.reserveGuestDailyQuota.mockResolvedValue({
      dateKey: '2026-05-03',
    });
    mocks.consumeGuestDailyQuotaReservation.mockResolvedValue({
      dateKey: '2026-05-03',
      limit: 100,
      used: 12,
      reserved: 0,
      remaining: 88,
    });
    mocks.releaseGuestDailyQuotaReservation.mockResolvedValue({
      dateKey: '2026-05-03',
    });
    mocks.getKieImageService.mockResolvedValue({
      generate: mocks.kieGenerate,
    });
    mocks.kieGenerate.mockResolvedValue({
      provider: 'kie-market',
      model: 'nano-banana-2',
      result: {
        taskId: 'provider-task-1',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          statusUrl: 'https://api.example.com/tasks/provider-task-1',
        },
        taskResult: null,
      },
    });
    mocks.createGuestAITask.mockImplementation(async (task) => task);
    mocks.createGuestTaskToken.mockReturnValue('guest-task-token-1');
    mocks.findAIModelRule.mockReturnValue({
      provider: 'kie-market',
      mediaType: AIMediaType.IMAGE,
      scenes: ['text-to-image'],
      exactModel: 'nano-banana-2',
    });
    mocks.getRequestedModelForScene.mockReturnValue(
      'gpt-image-2-text-to-image'
    );
    mocks.isGuestAllowedAIModel.mockImplementation(
      ({ model }: { model: string }) =>
        ![
          'nano-banana-2',
          'google/nano-banana-edit',
          'nano-banana-pro',
        ].includes(model)
    );
    mocks.getFirstImageUrl.mockImplementation(
      (options?: { image_url?: string; imageUrl?: string }) =>
        options?.image_url || options?.imageUrl
    );
    mocks.resolveKieMarketAspectRatio.mockReturnValue('1:1');
    mocks.resolveKieMarketOutputFormat.mockReturnValue('jpg');
    mocks.getUuid.mockReturnValue('guest-task-1');
    mocks.normalizeAIGenerateIdempotencyKey.mockReturnValue(null);
    mocks.createAIGenerateRequestHash.mockResolvedValue('guest-request-hash-1');
    mocks.claimAIGenerateMemoryIdempotency.mockReturnValue({
      kind: 'claimed',
      record: {
        requestHash: 'guest-request-hash-1',
        status: 'processing',
      },
    });
  });

  it('resolves a guest quota identity directly so signed-in users can keep using free browser quota', async () => {
    await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie:
            'better-auth.session_token=session-token; mogged_games_guest_id=signed-guest-token',
        },
        body: JSON.stringify({
          scene: 'text-to-image',
          prompt: 'A clean product photo',
        }),
      })
    );

    expect(mocks.resolveRequestGuestViewer).toHaveBeenCalledWith({
      request: expect.any(Request),
    });
    expect(mocks.reserveGuestDailyQuota).toHaveBeenCalledWith(
      expect.objectContaining({
        guestIdHash: 'guest-hash-1',
      }),
      12
    );
  });

  it('rejects invalid guest image payloads before reserving quota', async () => {
    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'text-to-video',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'invalid guest generate payload',
      errorCode: 'guest_image_invalid_payload',
    });
    expect(mocks.reserveGuestDailyQuota).not.toHaveBeenCalled();
    expect(mocks.createGuestAITask).not.toHaveBeenCalled();
  });

  it('rejects empty guest prompts as input errors before reserving quota', async () => {
    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'text-to-image',
          prompt: '   ',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'prompt is required',
      errorCode: 'guest_image_prompt_required',
    });
    expect(mocks.reserveGuestDailyQuota).not.toHaveBeenCalled();
    expect(mocks.kieGenerate).not.toHaveBeenCalled();
  });

  it('allows promptless guest image-to-image requests when a source image is provided', async () => {
    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'image-to-image',
          prompt: '   ',
          options: {
            image_url: 'https://cdn.example.com/source.png',
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.reserveGuestDailyQuota).toHaveBeenCalledTimes(1);
    expect(mocks.kieGenerate).toHaveBeenCalledWith({
      request: expect.objectContaining({
        scene: 'image-to-image',
        prompt: 'Edit the source image.',
        imageUrl: 'https://cdn.example.com/source.png',
      }),
      tier: 'free',
    });
    expect(mocks.createGuestAITask).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '',
        scene: 'image-to-image',
        options: expect.objectContaining({
          image_url: 'https://cdn.example.com/source.png',
        }),
      })
    );
  });

  it('returns stable guest input error codes for localized clients', async () => {
    const missingSourceImageResponse = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'image-to-image',
          prompt: 'Turn this into a product shot',
        }),
      })
    );

    expect(missingSourceImageResponse.status).toBe(400);
    expect(await missingSourceImageResponse.json()).toMatchObject({
      code: -1,
      errorCode: 'guest_image_source_image_required',
    });

    const privateSourceImageResponse = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'image-to-image',
          prompt: 'Turn this into a product shot',
          options: {
            image_url: 'http://localhost/private.png',
          },
        }),
      })
    );

    expect(privateSourceImageResponse.status).toBe(400);
    expect(await privateSourceImageResponse.json()).toMatchObject({
      code: -1,
      errorCode: 'guest_image_source_image_private',
    });

    const webSearchResponse = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'text-to-image',
          prompt: 'A current news collage',
          options: {
            web_search: true,
          },
        }),
      })
    );

    expect(webSearchResponse.status).toBe(400);
    expect(await webSearchResponse.json()).toMatchObject({
      code: -1,
      errorCode: 'guest_image_web_search_unavailable',
    });
    expect(mocks.reserveGuestDailyQuota).not.toHaveBeenCalled();
    expect(mocks.kieGenerate).not.toHaveBeenCalled();
  });

  it('creates guest image tasks against guest credits instead of account credits', async () => {
    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'text-to-image',
          prompt: 'A clean product photo',
          options: {
            aspect_ratio: '1:1',
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.reserveGuestDailyQuota).toHaveBeenCalledWith(
      expect.objectContaining({
        isGuest: true,
        guestIdHash: 'guest-hash-1',
      }),
      12
    );
    expect(mocks.kieGenerate).toHaveBeenCalledWith({
      request: expect.objectContaining({
        scene: 'text-to-image',
        model: 'gpt-image-2-text-to-image',
        prompt: 'A clean product photo',
        resolution: '1K',
        webSearch: false,
      }),
      tier: 'free',
    });
    expect(mocks.createGuestAITask).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'guest-task-1',
        guestIdHash: 'guest-hash-1',
        dateKey: '2026-05-03',
        mediaType: AIMediaType.IMAGE,
        provider: 'kie-market',
        providerTaskId: 'provider-task-1',
        quotaUnits: 12,
        quotaStatus: 'used',
      })
    );
    expect(mocks.consumeGuestDailyQuotaReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        guestIdHash: 'guest-hash-1',
      }),
      '2026-05-03',
      12
    );
    expect(mocks.notifyGuestCreditsConsumed).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.objectContaining({
          id: 'guest-task-1',
          quotaUnits: 12,
        }),
        viewer: expect.objectContaining({
          guestIdHash: 'guest-hash-1',
        }),
        quotaAfter: expect.objectContaining({
          remaining: 88,
        }),
      })
    );
    expect(await response.json()).toMatchObject({
      code: 0,
      data: {
        id: 'guest-task-1',
        taskId: 'guest-task-1',
        taskToken: 'guest-task-token-1',
        providerTaskId: 'provider-task-1',
      },
    });
  });

  it('preserves guest-selected 2K and 4K image resolutions', async () => {
    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'text-to-image',
          model: 'gpt-image-2-text-to-image',
          prompt: 'A clean product photo',
          options: {
            resolution: '4K',
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.kieGenerate).toHaveBeenCalledWith({
      request: expect.objectContaining({
        model: 'gpt-image-2-text-to-image',
        resolution: '4K',
      }),
      tier: 'free',
    });
    expect(mocks.createGuestAITask).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          resolution: '4K',
        }),
      })
    );
  });

  it('allows a whitelisted selected KIE image model for guest generation', async () => {
    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'text-to-image',
          model: 'gpt-image-2-text-to-image',
          prompt: 'A clean product photo',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.isGuestAllowedAIModel).toHaveBeenCalledWith({
      provider: 'kie-market',
      mediaType: AIMediaType.IMAGE,
      model: 'gpt-image-2-text-to-image',
      scene: 'text-to-image',
    });
    expect(mocks.kieGenerate).toHaveBeenCalledWith({
      request: expect.objectContaining({
        model: 'gpt-image-2-text-to-image',
      }),
      tier: 'free',
    });
  });

  it('rejects VIP-only KIE image models for guest generation', async () => {
    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'text-to-image',
          model: 'nano-banana-2',
          prompt: 'A clean product photo',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: -1,
      errorCode: 'guest_image_invalid_payload',
    });
    expect(mocks.reserveGuestDailyQuota).not.toHaveBeenCalled();
    expect(mocks.kieGenerate).not.toHaveBeenCalled();
  });

  it('returns 409 for duplicate guest idempotency keys without reserving quota', async () => {
    mocks.normalizeAIGenerateIdempotencyKey.mockReturnValue('guest-key-123');
    mocks.claimAIGenerateMemoryIdempotency.mockReturnValue({
      kind: 'existing',
      record: {
        requestHash: 'guest-request-hash-1',
        status: 'processing',
        responsePayload: null,
        errorMessage: null,
      },
    });

    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'guest-key-123',
        },
        body: JSON.stringify({
          scene: 'text-to-image',
          prompt: 'A clean product photo',
        }),
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'same guest generate request is already processing',
    });
    expect(mocks.reserveGuestDailyQuota).not.toHaveBeenCalled();
    expect(mocks.kieGenerate).not.toHaveBeenCalled();
  });

  it('returns a sanitized 503 when guest quota storage is unavailable', async () => {
    const missingTableError = Object.assign(
      new Error(
        'Failed query: insert into "mogged_games"."guest_daily_quota"'
      ),
      {
        cause: {
          code: '42P01',
        },
      }
    );
    mocks.reserveGuestDailyQuota.mockRejectedValue(missingTableError);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'text-to-image',
          prompt: 'A clean product photo',
        }),
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'guest image generation is temporarily unavailable',
      errorCode: 'guest_image_generation_unavailable',
    });
    expect(mocks.kieGenerate).not.toHaveBeenCalled();
    expect(mocks.createGuestAITask).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      '[guest-image-generate] failed',
      expect.objectContaining({
        guestIdHash: 'guest-hash-1',
        dateKey: null,
        step: 'reserve-quota',
        error: missingTableError,
      })
    );

    consoleError.mockRestore();
  });

  it('returns a sanitized 503 and releases quota when guest task storage is unavailable', async () => {
    const missingTableError = Object.assign(
      new Error(
        'Failed query: insert into "mogged_games"."guest_ai_task"'
      ),
      {
        cause: {
          code: '42P01',
        },
      }
    );
    mocks.createGuestAITask.mockRejectedValue(missingTableError);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'text-to-image',
          prompt: 'A clean product photo',
        }),
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'guest image generation is temporarily unavailable',
      errorCode: 'guest_image_generation_unavailable',
    });
    expect(mocks.releaseGuestDailyQuotaReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        guestIdHash: 'guest-hash-1',
      }),
      '2026-05-03',
      12
    );
    expect(consoleError).toHaveBeenCalledWith(
      '[guest-image-generate] failed',
      expect.objectContaining({
        guestIdHash: 'guest-hash-1',
        dateKey: '2026-05-03',
        step: 'persist-guest-task',
        error: missingTableError,
      })
    );

    consoleError.mockRestore();
  });

  it('releases reserved quota when the provider does not return a task id', async () => {
    mocks.kieGenerate.mockResolvedValue({
      provider: 'kie-market',
      model: 'nano-banana-2',
      result: {
        taskStatus: AITaskStatus.FAILED,
      },
    });

    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const response = await POST(
      new Request('https://mogged.games/api/ai/guest-image-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: 'text-to-image',
          prompt: 'A clean product photo',
        }),
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'guest image generate failed',
    });
    expect(mocks.releaseGuestDailyQuotaReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        guestIdHash: 'guest-hash-1',
      }),
      '2026-05-03',
      12
    );
    expect(mocks.createGuestAITask).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
