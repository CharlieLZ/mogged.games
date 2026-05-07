import { z } from 'zod';

import {
  getAIGenerationCostCredits,
  getGuestRequestedModelForScene,
  isGuestAllowedAIModel,
} from '@/config/ai-model-registry';
import {
  KIE_MARKET_PROVIDER,
  type KieImageRequest,
  type KieImageScene,
  type KieNanoBananaOutputFormat,
  type KieNanoBananaResolution,
} from '@/extensions/ai/kie-market/types';
import {
  getFirstImageUrl,
  resolveKieMarketAspectRatio,
  resolveKieMarketOutputFormat,
} from '@/extensions/ai/provider-utils';
import { AIMediaType } from '@/extensions/ai/types';
import {
  claimAIGenerateMemoryIdempotency,
  completeAIGenerateMemoryIdempotency,
  createAIGenerateRequestHash,
  failAIGenerateMemoryIdempotency,
  normalizeAIGenerateIdempotencyKey,
} from '@/shared/lib/ai-generate-idempotency';
import { rateLimit } from '@/shared/lib/api/rate-limit';
import {
  createApiPreflightResponse,
  enforceApiWriteSecurity,
} from '@/shared/lib/api/request-security';
import { normalizeJsonbInput, parseDbJsonValue } from '@/shared/lib/db-json';
import { createGuestTaskToken } from '@/shared/lib/guest-task-token';
import { getUuid } from '@/shared/lib/hash';
import { normalizeImageGenerationPrompt } from '@/shared/lib/image-generation-prompt';
import { isPostgresUndefinedTableError } from '@/shared/lib/postgres-error';
import {
  getReferenceImageUrlErrorMessage,
  getReferenceImageUrlIssue,
} from '@/shared/lib/reference-image-url';
import { respData, respErr, respErrWithStatus } from '@/shared/lib/resp';
import {
  createGuestAITask,
  GuestQuotaTaskStatus,
} from '@/shared/models/guest_ai_task';
import {
  formatGuestQuotaDateKey,
  GuestQuotaExceededError,
} from '@/shared/models/guest_daily_quota';
import {
  consumeGuestDailyQuotaReservation,
  GuestQuotaGeoExceededError,
  releaseGuestDailyQuotaReservation,
  reserveGuestDailyQuota,
} from '@/shared/services/guest-daily-quota';
import {
  resolveRequestGuestViewer,
  type GuestViewer,
} from '@/shared/services/guest-viewer';
import { notifyGuestCreditsConsumed } from '@/shared/services/guest-cost-notification';
import { getKieImageService } from '@/shared/services/kie-image';

export const maxDuration = 300;

const guestGenerateLimiter = rateLimit({
  uniqueTokenPerInterval: 6,
  interval: 60 * 1000,
});
const GUEST_IMAGE_GENERATE_IDEMPOTENCY_SCOPE = 'guest-image-generate';
const GUEST_IMAGE_GENERATE_STORAGE_STEPS = new Set([
  'reserve-quota',
  'persist-guest-task',
  'consume-quota',
]);

type GuestImageGenerateErrorCode =
  | 'guest_image_invalid_payload'
  | 'guest_image_prompt_required'
  | 'guest_image_source_image_required'
  | 'guest_image_source_image_invalid'
  | 'guest_image_source_image_video'
  | 'guest_image_source_image_cloud_drive'
  | 'guest_image_source_image_private'
  | 'guest_image_web_search_unavailable'
  | 'guest_image_quota_exceeded'
  | 'guest_image_geo_restricted'
  | 'guest_image_generation_unavailable';

const guestGeneratePayloadSchema = z.object({
  scene: z.enum(['text-to-image', 'image-to-image']),
  model: z.string().trim().min(1).optional(),
  prompt: z.string().max(4000).optional().default(''),
  options: z.record(z.string(), z.unknown()).optional(),
});

class GuestImageGenerateInputError extends Error {
  constructor(
    message: string,
    readonly errorCode: GuestImageGenerateErrorCode
  ) {
    super(message);
    this.name = 'GuestImageGenerateInputError';
  }
}

function respGuestImageErrWithStatus(
  message: string,
  status: number,
  errorCode: GuestImageGenerateErrorCode
) {
  return Response.json(
    {
      code: -1,
      message,
      errorCode,
    },
    {
      status,
    }
  );
}

function normalizeBooleanFlag(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }

  return false;
}

function normalizeGuestImageResolution(
  value: unknown
): KieNanoBananaResolution {
  const normalized =
    typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (normalized === '2K' || normalized === '4K') {
    return normalized;
  }

  return '1K';
}

function getGuestReferenceImageErrorCode(
  issue: ReturnType<typeof getReferenceImageUrlIssue>
): GuestImageGenerateErrorCode {
  switch (issue) {
    case 'video':
      return 'guest_image_source_image_video';
    case 'cloud_drive_or_social':
      return 'guest_image_source_image_cloud_drive';
    case 'private_host':
      return 'guest_image_source_image_private';
    case 'invalid':
    case 'unsupported_protocol':
    case 'non_image_attachment':
    default:
      return 'guest_image_source_image_invalid';
  }
}

function normalizeGuestKieImageRequest(input: {
  scene: 'text-to-image' | 'image-to-image';
  model?: string;
  prompt: string;
  options?: Record<string, unknown>;
}) {
  const promptResult = normalizeImageGenerationPrompt({
    scene: input.scene,
    prompt: input.prompt,
  });
  if (!promptResult) {
    throw new GuestImageGenerateInputError(
      'prompt is required',
      'guest_image_prompt_required'
    );
  }

  const source = input.options || {};
  const imageUrls = Array.isArray(source.image_urls)
    ? source.image_urls.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0
      )
    : [];
  const imageUrl = imageUrls[0] ?? getFirstImageUrl(source);
  const allImageUrls =
    imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [];
  if (allImageUrls.length > 5) {
    throw new GuestImageGenerateInputError(
      'image-to-image supports up to 5 source images.',
      'guest_image_invalid_payload'
    );
  }

  for (const item of allImageUrls) {
    const imageIssue = getReferenceImageUrlIssue(item);
    if (imageIssue) {
      throw new GuestImageGenerateInputError(
        getReferenceImageUrlErrorMessage(imageIssue),
        getGuestReferenceImageErrorCode(imageIssue)
      );
    }
  }

  if (input.scene === 'image-to-image' && !imageUrl) {
    throw new GuestImageGenerateInputError(
      'image_url is required for image-to-image requests.',
      'guest_image_source_image_required'
    );
  }

  const aspectRatio = resolveKieMarketAspectRatio(source) || '1:1';
  const outputFormat = (resolveKieMarketOutputFormat(source) ||
    'jpg') as KieNanoBananaOutputFormat;
  const resolution = normalizeGuestImageResolution(source.resolution);
  const webSearch = normalizeBooleanFlag(
    source.google_search ?? source.web_search ?? source.webSearch
  );

  if (webSearch) {
    throw new GuestImageGenerateInputError(
      'web search is not available for guest generations',
      'guest_image_web_search_unavailable'
    );
  }

  const request: KieImageRequest = {
    scene: input.scene as KieImageScene,
    prompt: promptResult.providerPrompt,
    imageUrl: imageUrl || undefined,
    aspectRatio,
    resolution,
    outputFormat,
    webSearch: false,
  };

  if (input.model) {
    request.model = input.model;
  }

  if (allImageUrls.length > 1) {
    request.imageUrls = allImageUrls;
  }

  const normalizedOptions: Record<string, unknown> = {
    aspect_ratio: aspectRatio,
    resolution,
    output_format: outputFormat,
    web_search: false,
  };

  if (imageUrl) {
    normalizedOptions.image_url = imageUrl;
  }

  if (allImageUrls.length > 1) {
    normalizedOptions.image_urls = allImageUrls;
  }

  return {
    normalizedPrompt: promptResult.normalizedPrompt,
    normalizedOptions,
    request,
  };
}

function isGuestImageStorageUnavailable(error: unknown) {
  if (isPostgresUndefinedTableError(error)) {
    return true;
  }

  const message =
    error instanceof Error ? error.message : String(error ?? '').trim();
  const isGuestImageStorageTable =
    message.includes('guest_daily_quota') || message.includes('guest_ai_task');

  return (
    isGuestImageStorageTable &&
    (message.includes('does not exist') ||
      message.includes('no such table') ||
      message.includes('relation') ||
      message.includes('Failed query'))
  );
}

export function OPTIONS() {
  return createApiPreflightResponse();
}

export async function POST(request: Request) {
  let reservedDateKey: string | null = null;
  let reservedQuotaUnits = 0;
  let quotaFinalized = false;
  let viewer: GuestViewer | null = null;
  let guestViewer: GuestViewer | null = null;
  let failureStep = 'parse-request';
  let claimedIdempotency: {
    guestId: string;
    key: string;
    scope: string;
  } | null = null;

  try {
    const securityResponse = await enforceApiWriteSecurity(
      request,
      'ai-guest-image-generate-post'
    );
    if (securityResponse) {
      return securityResponse;
    }

    viewer = await resolveRequestGuestViewer({ request });
    if (!viewer) {
      return respErrWithStatus('guest unavailable', 503);
    }

    const activeGuestViewer = viewer;
    guestViewer = activeGuestViewer;

    const rate = await guestGenerateLimiter(
      `ai-guest-image-generate:${activeGuestViewer.ipHash}:${activeGuestViewer.id}`
    );
    if (!rate.success) {
      return respErrWithStatus('too many guest generate attempts', 429);
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return respGuestImageErrWithStatus(
        'invalid guest generate payload',
        400,
        'guest_image_invalid_payload'
      );
    }

    const payload = guestGeneratePayloadSchema.safeParse(rawBody);
    if (!payload.success) {
      return respGuestImageErrWithStatus(
        'invalid guest generate payload',
        400,
        'guest_image_invalid_payload'
      );
    }

    failureStep = 'normalize-request';
    let normalized: ReturnType<typeof normalizeGuestKieImageRequest>;
    try {
      const requestedModel =
        payload.data.model ||
        getGuestRequestedModelForScene(payload.data.scene);
      if (
        !isGuestAllowedAIModel({
          provider: KIE_MARKET_PROVIDER,
          mediaType: AIMediaType.IMAGE,
          model: requestedModel,
          scene: payload.data.scene,
        })
      ) {
        throw new GuestImageGenerateInputError(
          'model is not allowed for this route',
          'guest_image_invalid_payload'
        );
      }

      normalized = normalizeGuestKieImageRequest({
        ...payload.data,
        model: requestedModel,
      });
    } catch (error) {
      return respGuestImageErrWithStatus(
        error instanceof Error
          ? error.message
          : 'invalid guest generate payload',
        400,
        error instanceof GuestImageGenerateInputError
          ? error.errorCode
          : 'guest_image_invalid_payload'
      );
    }
    const requestedModel =
      payload.data.model ||
      getGuestRequestedModelForScene(payload.data.scene) ||
      normalized.request.scene;
    const guestCreditsCost = Math.max(
      1,
      getAIGenerationCostCredits(payload.data.scene, {
        resolution: normalized.request.resolution,
        model: requestedModel,
      })
    );
    const idempotencyKey = normalizeAIGenerateIdempotencyKey(
      request.headers.get('idempotency-key') ||
        request.headers.get('x-idempotency-key')
    );
    if (idempotencyKey) {
      const requestHash = await createAIGenerateRequestHash({
        mediaType: AIMediaType.IMAGE,
        provider: KIE_MARKET_PROVIDER,
        model: requestedModel,
        scene: payload.data.scene,
        prompt: normalized.normalizedPrompt,
        options: normalized.normalizedOptions,
      });
      const claim = claimAIGenerateMemoryIdempotency({
        userId: activeGuestViewer.id,
        scope: GUEST_IMAGE_GENERATE_IDEMPOTENCY_SCOPE,
        idempotencyKey,
        requestHash,
      });

      if (claim.kind === 'existing') {
        if (claim.record.requestHash !== requestHash) {
          return respErrWithStatus(
            'idempotency key conflicts with a different guest generate payload',
            409
          );
        }

        if (
          claim.record.status === 'completed' &&
          claim.record.responsePayload
        ) {
          return respData(claim.record.responsePayload);
        }

        if (claim.record.status === 'processing') {
          return respErrWithStatus(
            'same guest generate request is already processing',
            409
          );
        }

        return respErr(
          claim.record.errorMessage ||
            'same guest generate request failed recently, retry with a new idempotency key'
        );
      }

      claimedIdempotency = {
        guestId: activeGuestViewer.id,
        key: idempotencyKey,
        scope: GUEST_IMAGE_GENERATE_IDEMPOTENCY_SCOPE,
      };
    }

    failureStep = 'reserve-quota';
    const quota = await reserveGuestDailyQuota(
      activeGuestViewer,
      guestCreditsCost
    );
    reservedDateKey = quota.dateKey || formatGuestQuotaDateKey();
    reservedQuotaUnits = guestCreditsCost;

    const kieImageService = await getKieImageService();
    failureStep = 'kie-image.generate';
    const dispatchResult = await kieImageService.generate({
      request: normalized.request,
      tier: 'free',
    });

    const result = dispatchResult.result;
    if (!result?.taskId) {
      throw new Error('guest image generate failed');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    failureStep = 'persist-guest-task';
    const task = await createGuestAITask({
      id: getUuid(),
      guestIdHash: activeGuestViewer.guestIdHash,
      dateKey: reservedDateKey,
      mediaType: AIMediaType.IMAGE,
      provider: dispatchResult.provider || KIE_MARKET_PROVIDER,
      model: dispatchResult.model || requestedModel,
      prompt: normalized.normalizedPrompt,
      scene: payload.data.scene,
      options: normalizeJsonbInput(normalized.normalizedOptions),
      status: result.taskStatus,
      providerTaskId: result.taskId,
      taskInfo: normalizeJsonbInput(result.taskInfo),
      taskResult: normalizeJsonbInput(result.taskResult),
      quotaUnits: guestCreditsCost,
      quotaStatus: GuestQuotaTaskStatus.USED,
      expiresAt,
    });

    failureStep = 'consume-quota';
    const quotaAfter = await consumeGuestDailyQuotaReservation(
      activeGuestViewer,
      reservedDateKey,
      guestCreditsCost
    );
    quotaFinalized = true;

    await notifyGuestCreditsConsumed({
      task,
      viewer: activeGuestViewer,
      quotaAfter,
      request,
    });

    const taskInfoObj =
      parseDbJsonValue<Record<string, unknown>>(result.taskInfo) || {};

    const responsePayload = {
      ...task,
      taskId: task.id,
      taskToken: createGuestTaskToken({
        guestIdHash: activeGuestViewer.guestIdHash,
        taskId: task.id,
      }),
      providerTaskId: result.taskId,
      taskInfo: taskInfoObj,
      statusUrl:
        (taskInfoObj.statusUrl as string | undefined) ||
        (taskInfoObj.status_url as string | undefined),
      responseUrl:
        (taskInfoObj.responseUrl as string | undefined) ||
        (taskInfoObj.response_url as string | undefined),
    };

    if (claimedIdempotency) {
      completeAIGenerateMemoryIdempotency({
        userId: claimedIdempotency.guestId,
        scope: claimedIdempotency.scope,
        idempotencyKey: claimedIdempotency.key,
        responsePayload,
      });
    }

    return respData(responsePayload);
  } catch (error) {
    guestViewer = viewer;

    if (reservedDateKey && guestViewer && !quotaFinalized) {
      await releaseGuestDailyQuotaReservation(
        guestViewer,
        reservedDateKey,
        reservedQuotaUnits || 1
      ).catch((releaseError) => {
        console.error('[guest-image-generate] quota release failed', {
          guestIdHash: guestViewer?.guestIdHash ?? null,
          dateKey: reservedDateKey,
          step: 'release-reservation',
          error: releaseError,
        });
      });
    }

    if (claimedIdempotency) {
      failAIGenerateMemoryIdempotency({
        userId: claimedIdempotency.guestId,
        scope: claimedIdempotency.scope,
        idempotencyKey: claimedIdempotency.key,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'guest image generate failed',
      });
    }

    if (error instanceof GuestQuotaGeoExceededError) {
      return respGuestImageErrWithStatus(
        error.message,
        403,
        'guest_image_geo_restricted'
      );
    }

    if (error instanceof GuestQuotaExceededError) {
      return respGuestImageErrWithStatus(
        error.message,
        429,
        'guest_image_quota_exceeded'
      );
    }

    if (error instanceof GuestImageGenerateInputError) {
      return respGuestImageErrWithStatus(error.message, 400, error.errorCode);
    }

    console.error('[guest-image-generate] failed', {
      guestIdHash: guestViewer?.guestIdHash ?? null,
      dateKey: reservedDateKey,
      step: failureStep,
      error,
    });

    if (
      GUEST_IMAGE_GENERATE_STORAGE_STEPS.has(failureStep) &&
      isGuestImageStorageUnavailable(error)
    ) {
      return respGuestImageErrWithStatus(
        'guest image generation is temporarily unavailable',
        503,
        'guest_image_generation_unavailable'
      );
    }

    return respErrWithStatus(
      error instanceof Error ? error.message : 'guest image generate failed',
      500
    );
  }
}
