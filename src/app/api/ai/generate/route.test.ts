import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SEEDANCE_PROVIDER } from '@/extensions/ai/seedance/types';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';

import { POST } from './route';

const testGlobals = globalThis as typeof globalThis & {
  __imageeditoraiRateLimitStore?: Map<string, unknown>;
};

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();

  return {
    ...actual,
    after: vi.fn((callback: () => unknown) => callback()),
  };
});

const mocks = vi.hoisted(() => ({
  enforceApiWriteSecurity: vi.fn(),
  getUserInfo: vi.fn(),
  findAIModelRule: vi.fn(),
  getAIGenerationCostCredits: vi.fn(),
  getFirstImageUrl: vi.fn(),
  resolveKieMarketAspectRatio: vi.fn(),
  resolveKieMarketOutputFormat: vi.fn(),
  resolveKieNanoBananaProResolution: vi.fn(),
  toFiniteNumber: vi.fn(),
  toTrimmedString: vi.fn(),
  getRemainingCredits: vi.fn(),
  getSeedanceService: vi.fn(),
  getKieImageService: vi.fn(),
  kieImageGenerate: vi.fn(),
  resolvePaidAccessState: vi.fn(),
  resolveSeedanceEntitlement: vi.fn(),
  seedanceGenerate: vi.fn(),
  createAITask: vi.fn(),
  upsertUserNotificationPreference: vi.fn(),
  safeRecordUserContextEvent: vi.fn(),
  syncAITaskUserNotifications: vi.fn(),
  recordFirstSuccessfulGeneration: vi.fn(),
  getUuid: vi.fn(),
  resolveRequestContext: vi.fn(),
  getClientIpFromHeaders: vi.fn(),
  claimAIGenerateIdempotency: vi.fn(),
  completeAIGenerateIdempotency: vi.fn(),
  failAIGenerateIdempotency: vi.fn(),
  normalizeAIGenerateIdempotencyKey: vi.fn(),
  createAIGenerateRequestHash: vi.fn(),
  claimAIGenerateMemoryIdempotency: vi.fn(),
  completeAIGenerateMemoryIdempotency: vi.fn(),
  failAIGenerateMemoryIdempotency: vi.fn(),
  parseAIGenerateIdempotencyResponse: vi.fn(),
  isAIGenerateIdempotencyStorageError: vi.fn(),
}));

const configState = vi.hoisted(() => ({
  appUrl: 'https://mogged.games',
}));

vi.mock('@/config', () => ({
  envConfigs: {
    get app_url() {
      return configState.appUrl;
    },
  },
}));

vi.mock('@/shared/lib/api/request-security', () => ({
  createApiPreflightResponse: vi.fn(() => new Response(null, { status: 204 })),
  enforceApiWriteSecurity: mocks.enforceApiWriteSecurity,
}));

vi.mock('@/shared/services/current-user', () => ({
  getUserInfo: mocks.getUserInfo,
}));

vi.mock('@/config/ai-model-registry', () => ({
  findAIModelRule: mocks.findAIModelRule,
  getAIGenerationCostCredits: mocks.getAIGenerationCostCredits,
}));

vi.mock('@/extensions/ai/provider-utils', () => {
  return {
    getFirstImageUrl: mocks.getFirstImageUrl,
    resolveKieMarketAspectRatio: mocks.resolveKieMarketAspectRatio,
    resolveKieMarketOutputFormat: mocks.resolveKieMarketOutputFormat,
    resolveKieNanoBananaProResolution: mocks.resolveKieNanoBananaProResolution,
    toFiniteNumber: mocks.toFiniteNumber,
    toTrimmedString: mocks.toTrimmedString,
  };
});

vi.mock('@/shared/models/credit', () => ({
  getRemainingCredits: mocks.getRemainingCredits,
}));

vi.mock('@/shared/services/seedance', () => ({
  getSeedanceService: mocks.getSeedanceService,
}));

vi.mock('@/shared/services/kie-image', () => ({
  getKieImageService: mocks.getKieImageService,
}));

vi.mock('@/shared/services/paid-access', () => ({
  resolvePaidAccessState: mocks.resolvePaidAccessState,
}));

vi.mock('@/shared/services/seedance-entitlement', () => ({
  resolveSeedanceEntitlement: mocks.resolveSeedanceEntitlement,
}));

vi.mock('@/shared/models/ai_task', () => ({
  createAITask: mocks.createAITask,
}));

vi.mock('@/shared/models/user-notification-preference', () => ({
  upsertUserNotificationPreference: mocks.upsertUserNotificationPreference,
}));

vi.mock('@/shared/models/user_context_event', () => ({
  safeRecordUserContextEvent: mocks.safeRecordUserContextEvent,
}));

vi.mock('@/shared/services/ai-task-user-notifications', () => ({
  syncAITaskUserNotifications: mocks.syncAITaskUserNotifications,
}));

vi.mock('@/shared/services/funnel-observability', () => ({
  recordFirstSuccessfulGeneration: mocks.recordFirstSuccessfulGeneration,
}));

vi.mock('@/shared/lib/hash', () => ({
  getUuid: mocks.getUuid,
}));

vi.mock('@/shared/lib/request-context', () => ({
  resolveRequestContext: mocks.resolveRequestContext,
  getClientIpFromHeaders: mocks.getClientIpFromHeaders,
}));

vi.mock('@/shared/models/subscription', () => ({
  getCurrentSubscription: vi.fn().mockResolvedValue(null),
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
  createAIGenerateRequestHash: mocks.createAIGenerateRequestHash,
  failAIGenerateMemoryIdempotency: mocks.failAIGenerateMemoryIdempotency,
  isAIGenerateIdempotencyStorageError:
    mocks.isAIGenerateIdempotencyStorageError,
  normalizeAIGenerateIdempotencyKey: mocks.normalizeAIGenerateIdempotencyKey,
  parseAIGenerateIdempotencyResponse: mocks.parseAIGenerateIdempotencyResponse,
}));

describe('/api/ai/generate contract', () => {
  beforeEach(() => {
    testGlobals.__imageeditoraiRateLimitStore?.clear();
    vi.clearAllMocks();
    configState.appUrl = 'https://mogged.games';

    mocks.enforceApiWriteSecurity.mockResolvedValue(null);
    mocks.getUserInfo.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
    });
    mocks.findAIModelRule.mockReturnValue(true);
    mocks.getAIGenerationCostCredits.mockImplementation(
      (
        _scene: string,
        input?: {
          durationSeconds?: number | string | null;
          resolution?: string | null;
          fast?: boolean | string | null;
          webSearch?: boolean | string | null;
          hasVideoInput?: boolean | string | null;
        }
      ) => {
        const duration = Number(input?.durationSeconds ?? 0);
        const resolution = input?.resolution === '480p' ? '480p' : '720p';
        const fast = input?.fast !== false && input?.fast !== 'false';
        const webSearch =
          input?.webSearch === true || input?.webSearch === 'true';
        const hasVideoInput =
          input?.hasVideoInput === true || input?.hasVideoInput === 'true';
        const baseRate =
          resolution === '480p' ? (fast ? 5 : 6) : fast ? 10 : 12;

        return (
          duration * (baseRate + (hasVideoInput ? 3 : 0)) + (webSearch ? 1 : 0)
        );
      }
    );
    mocks.getFirstImageUrl.mockImplementation(
      (options?: { image_url?: string; imageUrl?: string }) =>
        options?.image_url || options?.imageUrl
    );
    mocks.resolveKieMarketAspectRatio.mockImplementation(
      (options?: { aspect_ratio?: string; aspectRatio?: string }) =>
        options?.aspect_ratio || options?.aspectRatio || '1:1'
    );
    mocks.resolveKieMarketOutputFormat.mockImplementation(
      (options?: { output_format?: string; outputFormat?: string }) =>
        options?.output_format || options?.outputFormat || 'jpg'
    );
    mocks.resolveKieNanoBananaProResolution.mockImplementation(
      (options?: { resolution?: string }) => options?.resolution || '1K'
    );
    mocks.toFiniteNumber.mockImplementation((value?: number | string) => {
      const parsed =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? Number(value)
            : Number.NaN;

      return Number.isFinite(parsed) ? parsed : undefined;
    });
    mocks.toTrimmedString.mockImplementation((value?: string) => {
      if (typeof value !== 'string') {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed ? trimmed : undefined;
    });
    mocks.getRemainingCredits.mockResolvedValue(1000);
    mocks.seedanceGenerate.mockReset();
    mocks.kieImageGenerate.mockReset();
    mocks.resolvePaidAccessState.mockResolvedValue({
      tier: 'free',
      hasPaidCreditHistory: false,
      hasCurrentSubscription: false,
    });
    mocks.resolveSeedanceEntitlement.mockResolvedValue({
      tier: 'paid',
      watermark: false,
      hasPaidCreditHistory: true,
      hasCurrentSubscription: false,
    });
    mocks.seedanceGenerate.mockResolvedValue({
      provider: 'apixo',
      model: 'seedance-2.0-fast',
      result: {
        taskId: 'provider-task-1',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          statusUrl: 'https://api.example.com/tasks/provider-task-1',
          response_url: 'https://api.example.com/tasks/provider-task-1/result',
        },
      },
    });
    mocks.getSeedanceService.mockResolvedValue({
      generate: mocks.seedanceGenerate,
    });
    mocks.kieImageGenerate.mockResolvedValue({
      provider: 'kie-market',
      model: 'nano-banana-2',
      result: {
        taskId: 'kie-task-1',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          statusUrl:
            'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=kie-task-1',
          responseUrl: 'https://api.kie.ai/api/v1/jobs/createTask',
        },
      },
    });
    mocks.getKieImageService.mockResolvedValue({
      generate: mocks.kieImageGenerate,
    });
    mocks.createAITask.mockResolvedValue(null);
    mocks.upsertUserNotificationPreference.mockResolvedValue({
      userId: 'user-1',
      aiTaskCompletionEmailEnabled: false,
    });
    mocks.safeRecordUserContextEvent.mockResolvedValue(undefined);
    mocks.syncAITaskUserNotifications.mockResolvedValue(undefined);
    mocks.recordFirstSuccessfulGeneration.mockResolvedValue('recorded');
    mocks.getUuid.mockReturnValue('task-record-1');
    mocks.resolveRequestContext.mockReturnValue({
      path: '/api/ai/generate',
      locale: 'en',
    });
    mocks.getClientIpFromHeaders.mockReturnValue('1.2.3.4');
    mocks.normalizeAIGenerateIdempotencyKey.mockReturnValue(null);
    mocks.isAIGenerateIdempotencyStorageError.mockReturnValue(false);
    mocks.claimAIGenerateMemoryIdempotency.mockReturnValue({
      kind: 'claimed',
      record: {
        status: 'processing',
      },
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  it('rejects schema-invalid generate payloads with a 400 contract response', async () => {
    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: 'studio',
          prompt: 'missing media type and model',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'invalid generate payload',
    });
    expect(mocks.getSeedanceService).not.toHaveBeenCalled();
  });

  it('rejects video files passed through image_url for image-to-video requests', async () => {
    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'animate this',
          scene: 'image-to-video',
          options: {
            image_url: 'https://cdn.example.com/reference.mp4',
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'image_url must point to an image file.',
    });
    expect(mocks.getSeedanceService).not.toHaveBeenCalled();
  });

  it('rejects storage-backed reference videos when mime sniff resolves to webm', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: {
          'Content-Type': 'video/webm',
        },
      })
    );

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'keep the horse identity',
          scene: 'reference-to-video',
          options: {
            image_urls: ['https://cdn.example.com/reference.png'],
            video_urls: [
              'https://mogged.games/api/storage/file?key=uploads/ref-1',
            ],
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: -1,
      message:
        'storage-backed reference videos must resolve to MP4/MOV/M4V before they can be sent to the current providers.',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://mogged.games/api/storage/file?key=uploads/ref-1',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Range: 'bytes=0-0',
        },
      })
    );
    expect(mocks.getSeedanceService).not.toHaveBeenCalled();
  });

  it('allows storage-backed reference videos when mime sniff resolves to mp4', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 206,
        headers: {
          'Content-Type': 'video/mp4',
        },
      })
    );

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'keep the horse identity',
          scene: 'reference-to-video',
          options: {
            image_urls: ['https://cdn.example.com/reference.png'],
            video_urls: [
              'https://mogged.games/api/storage/file?key=uploads/ref-2',
            ],
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      message: 'ok',
      data: {
        scene: 'reference-to-video',
      },
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://mogged.games/api/storage/file?key=uploads/ref-2',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Range: 'bytes=0-0',
        },
      })
    );
  });

  it('returns the persisted task envelope for accepted generate requests', async () => {
    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'golden hour skyline',
          scene: 'text-to-video',
          options: {
            aspect_ratio: '16:9',
            return_last_frame: true,
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      message: 'ok',
      data: {
        id: 'task-record-1',
        userId: 'user-1',
        mediaType: AIMediaType.VIDEO,
        provider: 'apixo',
        model: 'seedance-2.0-fast',
        prompt: 'golden hour skyline',
        scene: 'text-to-video',
        options: {
          fast: true,
          duration: 15,
          execution_expires_after: 172800,
          resolution: '720p',
          aspect_ratio: '16:9',
          generate_audio: true,
          web_search: false,
          safety_identifier: expect.stringMatching(/^[a-f0-9]{64}$/),
          watermark: false,
          return_last_frame: true,
          image_urls: [],
          video_urls: [],
          audio_urls: [],
        },
        status: AITaskStatus.PROCESSING,
        costCredits: 150,
        taskId: 'provider-task-1',
        taskInfo: {
          statusUrl: 'https://api.example.com/tasks/provider-task-1',
          response_url: 'https://api.example.com/tasks/provider-task-1/result',
        },
        taskResult: null,
        statusUrl: 'https://api.example.com/tasks/provider-task-1',
        responseUrl: 'https://api.example.com/tasks/provider-task-1/result',
      },
    });

    expect(mocks.createAITask).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-record-1',
        userId: 'user-1',
        mediaType: AIMediaType.VIDEO,
        provider: 'apixo',
        model: 'seedance-2.0-fast',
        scene: 'text-to-video',
        costCredits: 150,
      })
    );
    expect(mocks.seedanceGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          executionExpiresAfter: 172800,
          returnLastFrame: true,
          safetyIdentifier: expect.stringMatching(/^[a-f0-9]{64}$/),
          watermark: false,
        }),
      })
    );
    expect(mocks.getAIGenerationCostCredits).toHaveBeenCalledWith(
      'text-to-video',
      {
        durationSeconds: 15,
        resolution: '720p',
        fast: true,
        webSearch: false,
        hasVideoInput: false,
      }
    );
    expect(mocks.recordFirstSuccessfulGeneration).not.toHaveBeenCalled();
  });

  it('stores task-level completion notifications and saves the default preference when requested', async () => {
    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'notify me when the render is done',
          scene: 'text-to-video',
          notifications: {
            notifyOnCompletion: true,
            notifyOnCompletionByDefault: true,
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      data: {
        id: 'task-record-1',
      },
    });

    expect(mocks.createAITask).toHaveBeenCalledWith(
      expect.objectContaining({
        completionNotificationRequested: true,
        completionNotificationLocale: 'en',
      })
    );
    expect(mocks.upsertUserNotificationPreference).toHaveBeenCalledWith({
      userId: 'user-1',
      aiTaskCompletionEmailEnabled: true,
    });
  });

  it('masks provider credential details when runtime config is missing', async () => {
    mocks.seedanceGenerate.mockRejectedValue(
      new Error(
        'No Seedance providers are configured. Missing credentials: volcengine (set VOLCENGINE_API_KEY or save the Volcengine API Key in admin settings).'
      )
    );

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'golden hour skyline',
          scene: 'text-to-video',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: -1,
      errorCode: 'ai_generate_provider_unavailable',
      message:
        'This AI route is temporarily unavailable because an upstream provider is not configured.',
    });
  });

  it('rewrites real-person reference blocks into a provider-agnostic validation message', async () => {
    mocks.seedanceGenerate.mockRejectedValue(
      new Error(
        'Volcengine generate failed: The request failed because the input image may contain real person. Request id: 0217762461106584aa509763bcfc4a023d494b51b31f69bf90ae4'
      )
    );

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: '',
          scene: 'image-to-video',
          options: {
            image_url: 'https://cdn.example.com/portrait.png',
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: -1,
      errorCode: 'ai_generate_reference_unsupported',
      message:
        'Reference media is not supported by the current provider chain. Please replace the input and try again.',
    });
  });

  it('rewrites bare upstream permission errors into a provider-agnostic availability message', async () => {
    mocks.seedanceGenerate.mockRejectedValue(
      new Error('KIE generate failed: permission error')
    );

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'golden hour skyline',
          scene: 'reference-to-video',
          options: {
            image_urls: ['https://cdn.example.com/reference.png'],
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: -1,
      errorCode: 'ai_generate_provider_unavailable',
      message:
        'This AI route is temporarily unavailable because an upstream provider rejected the request with a permission error.',
    });
  });

  it('strips provider branding from generic upstream generate errors', async () => {
    mocks.seedanceGenerate.mockRejectedValue(
      new Error('Volcengine generate failed: task not found')
    );

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'golden hour skyline',
          scene: 'text-to-video',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: -1,
      errorCode: 'ai_generate_request_failed',
      message: 'Generation could not be completed. Please try again.',
    });
  });

  it('records a first-success funnel event when generate returns an immediate success task', async () => {
    mocks.seedanceGenerate.mockResolvedValue({
      provider: 'apixo',
      model: 'seedance-2.0-fast',
      result: {
        taskId: 'provider-task-success',
        taskStatus: AITaskStatus.SUCCESS,
        taskInfo: {
          status: 'success',
        },
        taskResult: {
          videos: ['https://cdn.example.com/output.mp4'],
        },
      },
    });

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'golden hour skyline',
          scene: 'text-to-video',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.recordFirstSuccessfulGeneration).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: 'task-record-1',
        userId: 'user-1',
        status: AITaskStatus.SUCCESS,
      }),
      source: 'generate',
      requestContext: expect.objectContaining({
        path: '/api/ai/generate',
      }),
    });
  });

  it('accepts promptless reference-to-video requests and forwards official-only options', async () => {
    mocks.resolveSeedanceEntitlement.mockResolvedValue({
      tier: 'free',
      watermark: true,
      hasPaidCreditHistory: false,
      hasCurrentSubscription: false,
    });

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: '',
          scene: 'reference-to-video',
          options: {
            image_urls: ['https://cdn.example.com/reference.png'],
            execution_expires_after: 7200,
            watermark: false,
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      message: 'ok',
      data: {
        scene: 'reference-to-video',
        prompt: '',
        options: {
          fast: true,
          duration: 15,
          execution_expires_after: 7200,
          resolution: '720p',
          aspect_ratio: '16:9',
          generate_audio: true,
          web_search: false,
          watermark: true,
          image_urls: ['https://cdn.example.com/reference.png'],
          video_urls: [],
          audio_urls: [],
        },
      },
    });
    expect(mocks.seedanceGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          scene: 'reference-to-video',
          prompt: '',
          executionExpiresAfter: 7200,
          watermark: true,
          imageUrls: ['https://cdn.example.com/reference.png'],
          safetyIdentifier: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      })
    );
  });

  it('returns a 409 when memory idempotency fallback sees the same request already processing', async () => {
    mocks.normalizeAIGenerateIdempotencyKey.mockReturnValue('memory-key-123');
    mocks.createAIGenerateRequestHash.mockResolvedValue('hash-123');
    mocks.claimAIGenerateIdempotency.mockRejectedValue(
      new Error('relation "ai_generate_idempotency" does not exist')
    );
    mocks.isAIGenerateIdempotencyStorageError.mockReturnValue(true);
    mocks.claimAIGenerateMemoryIdempotency.mockReturnValue({
      kind: 'existing',
      record: {
        status: 'processing',
        requestHash: 'hash-123',
      },
    });

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
          'idempotency-key': 'memory-key-123',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'golden hour skyline',
          scene: 'text-to-video',
        }),
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'same generate request is already processing',
    });
    expect(mocks.getSeedanceService).not.toHaveBeenCalled();
  });

  it('returns the cached response when memory idempotency fallback already completed', async () => {
    mocks.normalizeAIGenerateIdempotencyKey.mockReturnValue('memory-key-456');
    mocks.createAIGenerateRequestHash.mockResolvedValue('hash-456');
    mocks.claimAIGenerateIdempotency.mockRejectedValue(
      new Error('relation "ai_generate_idempotency" does not exist')
    );
    mocks.isAIGenerateIdempotencyStorageError.mockReturnValue(true);
    mocks.claimAIGenerateMemoryIdempotency.mockReturnValue({
      kind: 'existing',
      record: {
        status: 'completed',
        requestHash: 'hash-456',
        responsePayload: {
          id: 'task-record-1',
          taskId: 'provider-task-1',
        },
      },
    });

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
          'idempotency-key': 'memory-key-456',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'golden hour skyline',
          scene: 'text-to-video',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      message: 'ok',
      data: {
        id: 'task-record-1',
        taskId: 'provider-task-1',
      },
    });
    expect(mocks.getSeedanceService).not.toHaveBeenCalled();
  });

  it('omits broken callback urls when app_url is blank', async () => {
    configState.appUrl = '   ';

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'animate this image',
          scene: 'image-to-video',
          options: {
            image_url: 'https://cdn.example.com/reference.jpg',
            duration: 5,
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.seedanceGenerate).toHaveBeenCalledTimes(1);

    const generateInput = mocks.seedanceGenerate.mock.calls[0]?.[0] as
      | {
          callbackUrlForProvider?: (provider: string) => string | undefined;
        }
      | undefined;

    expect(generateInput?.callbackUrlForProvider?.('apixo')).toBeUndefined();
  });

  it('logs structured failure context when dispatching generate fails', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    mocks.seedanceGenerate.mockRejectedValueOnce(new Error('provider down'));

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: SEEDANCE_PROVIDER,
          mediaType: AIMediaType.VIDEO,
          model: 'seedance-2.0',
          prompt: 'animate this image',
          scene: 'image-to-video',
          options: {
            image_url: 'https://cdn.example.com/reference.jpg',
            duration: 5,
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: -1,
      errorCode: 'ai_generate_request_failed',
      message: 'Generation could not be completed. Please try again.',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ai/generate] failed',
      expect.objectContaining({
        userId: 'user-1',
        requestedProvider: SEEDANCE_PROVIDER,
        resolvedProvider: null,
        mediaType: AIMediaType.VIDEO,
        scene: 'image-to-video',
        model: 'seedance-2.0',
        step: 'seedance.generate',
        error: 'provider down',
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it('accepts text-to-image requests and dispatches non-VIP models for free users', async () => {
    mocks.kieImageGenerate.mockResolvedValueOnce({
      provider: 'kie-market',
      model: 'gpt-image-2-text-to-image',
      result: {
        taskId: 'kie-task-1',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          statusUrl:
            'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=kie-task-1',
          responseUrl: 'https://api.kie.ai/api/v1/jobs/createTask',
        },
      },
    });

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: 'kie-market',
          mediaType: AIMediaType.IMAGE,
          model: 'gpt-image-2-text-to-image',
          prompt: 'luxury skincare bottle on wet black stone',
          scene: 'text-to-image',
          options: {
            resolution: '2K',
            aspect_ratio: '4:5',
            output_format: 'png',
            web_search: true,
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      data: {
        id: 'task-record-1',
        taskId: 'kie-task-1',
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        scene: 'text-to-image',
        model: 'gpt-image-2-text-to-image',
      },
    });
    expect(mocks.getKieImageService).toHaveBeenCalledTimes(1);
    expect(mocks.kieImageGenerate).toHaveBeenCalledWith({
      request: expect.objectContaining({
        scene: 'text-to-image',
        model: 'gpt-image-2-text-to-image',
        prompt: 'luxury skincare bottle on wet black stone',
        aspectRatio: '4:5',
        resolution: '2K',
        outputFormat: 'png',
        webSearch: true,
      }),
      tier: 'free',
    });
    expect(mocks.getSeedanceService).not.toHaveBeenCalled();
    expect(mocks.createAITask).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        scene: 'text-to-image',
        model: 'gpt-image-2-text-to-image',
        taskId: 'kie-task-1',
        costCredits: expect.any(Number),
      })
    );
  });

  it('rejects VIP image models for free users before dispatching to KIE', async () => {
    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: 'kie-market',
          mediaType: AIMediaType.IMAGE,
          model: 'nano-banana-2',
          prompt: 'luxury skincare bottle on wet black stone',
          scene: 'text-to-image',
          options: {
            resolution: '2K',
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: -1,
      errorCode: 'ai_generate_invalid_payload',
      message: 'upgrade required for VIP image models',
    });
    expect(mocks.kieImageGenerate).not.toHaveBeenCalled();
    expect(mocks.createAITask).not.toHaveBeenCalled();
  });

  it('routes paid image users through the paid KIE tier even without an active subscription', async () => {
    mocks.resolvePaidAccessState.mockResolvedValueOnce({
      tier: 'paid',
      hasPaidCreditHistory: true,
      hasCurrentSubscription: false,
    });

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: 'kie-market',
          mediaType: AIMediaType.IMAGE,
          model: 'nano-banana-2',
          prompt: 'studio product photo',
          scene: 'text-to-image',
          options: {
            resolution: '1K',
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.kieImageGenerate).toHaveBeenCalledWith({
      request: expect.objectContaining({
        scene: 'text-to-image',
        prompt: 'studio product photo',
      }),
      tier: 'paid',
    });
  });

  it('preserves advanced KIE image parameters when dispatching account tasks', async () => {
    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: 'kie-market',
          mediaType: AIMediaType.IMAGE,
          model: 'qwen/text-to-image',
          prompt: 'clean commercial poster',
          scene: 'text-to-image',
          options: {
            resolution: '1K',
            aspect_ratio: '4:3',
            output_format: 'png',
            seed: '12345',
            negative_prompt: 'blurry',
            guidance_scale: '4',
            num_inference_steps: '25',
            num_images: '2',
            nsfw_checker: 'true',
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.kieImageGenerate).toHaveBeenCalledWith({
      request: expect.objectContaining({
        scene: 'text-to-image',
        model: 'qwen/text-to-image',
        seed: 12345,
        negativePrompt: 'blurry',
        guidanceScale: 4,
        numInferenceSteps: 25,
        numImages: 2,
        nsfwChecker: true,
      }),
      tier: 'free',
    });
    expect(mocks.createAITask).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          seed: 12345,
          negative_prompt: 'blurry',
          guidance_scale: 4,
          num_inference_steps: 25,
          num_images: 2,
          nsfw_checker: true,
        }),
      })
    );
  });

  it('accepts image-to-image requests and forwards the reference image to KIE', async () => {
    mocks.kieImageGenerate.mockResolvedValueOnce({
      provider: 'kie-market',
      model: 'gpt-image-2-image-to-image',
      result: {
        taskId: 'kie-task-1',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          statusUrl:
            'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=kie-task-1',
          responseUrl: 'https://api.kie.ai/api/v1/jobs/createTask',
        },
      },
    });

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: 'kie-market',
          mediaType: AIMediaType.IMAGE,
          model: 'gpt-image-2-image-to-image',
          prompt: 'turn this product shot into a premium editorial scene',
          scene: 'image-to-image',
          options: {
            image_url: 'https://cdn.example.com/source.png',
            resolution: '1K',
            aspect_ratio: '1:1',
            output_format: 'jpg',
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      data: {
        taskId: 'kie-task-1',
        model: 'gpt-image-2-image-to-image',
      },
    });
    expect(mocks.kieImageGenerate).toHaveBeenCalledWith({
      request: expect.objectContaining({
        scene: 'image-to-image',
        model: 'gpt-image-2-image-to-image',
        prompt: 'turn this product shot into a premium editorial scene',
        imageUrl: 'https://cdn.example.com/source.png',
        aspectRatio: '1:1',
        resolution: '1K',
        outputFormat: 'jpg',
        webSearch: false,
      }),
      tier: 'free',
    });
    expect(mocks.createAITask).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'kie-market',
        mediaType: AIMediaType.IMAGE,
        scene: 'image-to-image',
        model: 'gpt-image-2-image-to-image',
        taskId: 'kie-task-1',
      })
    );
  });

  it('accepts promptless image-to-image requests when a reference image is provided', async () => {
    mocks.kieImageGenerate.mockResolvedValueOnce({
      provider: 'kie-market',
      model: 'gpt-image-2-image-to-image',
      result: {
        taskId: 'kie-task-1',
        taskStatus: AITaskStatus.PROCESSING,
        taskInfo: {
          statusUrl:
            'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=kie-task-1',
          responseUrl: 'https://api.kie.ai/api/v1/jobs/createTask',
        },
      },
    });

    const response = await POST(
      new Request('https://example.com/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          provider: 'kie-market',
          mediaType: AIMediaType.IMAGE,
          model: 'gpt-image-2-image-to-image',
          prompt: '   ',
          scene: 'image-to-image',
          options: {
            image_url: 'https://cdn.example.com/source.png',
            resolution: '1K',
            aspect_ratio: '1:1',
            output_format: 'jpg',
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: 0,
      data: {
        taskId: 'kie-task-1',
        model: 'gpt-image-2-image-to-image',
      },
    });
    expect(mocks.kieImageGenerate).toHaveBeenCalledWith({
      request: expect.objectContaining({
        scene: 'image-to-image',
        model: 'gpt-image-2-image-to-image',
        prompt: 'Edit the source image.',
        imageUrl: 'https://cdn.example.com/source.png',
        aspectRatio: '1:1',
        resolution: '1K',
        outputFormat: 'jpg',
        webSearch: false,
      }),
      tier: 'free',
    });
    expect(mocks.createAITask).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '',
        scene: 'image-to-image',
      })
    );
  });
});
