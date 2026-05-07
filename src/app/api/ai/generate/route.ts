import { createHash } from 'node:crypto';
import { after } from 'next/server';
import { z } from 'zod';

import { envConfigs } from '@/config';
import {
  findAIModelRule,
  getAIGenerationCostCredits,
} from '@/config/ai-model-registry';
import {
  getKieImageModel,
  type KieImageRequest,
  type KieImageScene,
  type KieNanoBananaOutputFormat,
} from '@/extensions/ai/kie-market/types';
import {
  getFirstImageUrl,
  resolveKieMarketAspectRatio,
  resolveKieMarketOutputFormat,
  resolveKieNanoBananaProResolution,
  toFiniteNumber,
  toTrimmedString,
} from '@/extensions/ai/provider-utils';
import { buildSeedanceCallbackUrl } from '@/extensions/ai/seedance/callback-url';
import type { SeedanceScene } from '@/extensions/ai/seedance/types';
import {
  assertStorageBackedSeedanceVideoFormats,
  normalizeSeedanceRequest,
} from '@/extensions/ai/seedance/validation';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';
import {
  claimAIGenerateMemoryIdempotency,
  completeAIGenerateMemoryIdempotency,
  createAIGenerateRequestHash,
  failAIGenerateMemoryIdempotency,
  isAIGenerateIdempotencyStorageError,
  normalizeAIGenerateIdempotencyKey,
  parseAIGenerateIdempotencyResponse,
} from '@/shared/lib/ai-generate-idempotency';
import { rateLimit } from '@/shared/lib/api/rate-limit';
import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { canUseImageModel } from '@/shared/blocks/generator/image-generator-config';
import { normalizeJsonbInput, parseDbJsonValue } from '@/shared/lib/db-json';
import { getUuid } from '@/shared/lib/hash';
import { normalizeImageGenerationPrompt } from '@/shared/lib/image-generation-prompt';
import {
  getReferenceImageUrlErrorMessage,
  getReferenceImageUrlIssue,
} from '@/shared/lib/reference-image-url';
import { resolveRequestContext } from '@/shared/lib/request-context';
import { respData, respErr } from '@/shared/lib/resp';
import {
  AIGenerateIdempotencyStatus,
  claimAIGenerateIdempotency,
  completeAIGenerateIdempotency,
  failAIGenerateIdempotency,
} from '@/shared/models/ai_generate_idempotency';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import { getRemainingCredits } from '@/shared/models/credit';
import { safeRecordUserContextEvent } from '@/shared/models/user_context_event';
import { upsertUserNotificationPreference } from '@/shared/models/user-notification-preference';
import { syncAITaskUserNotifications } from '@/shared/services/ai-task-user-notifications';
import { recordFirstSuccessfulGeneration } from '@/shared/services/funnel-observability';
import { getKieImageService } from '@/shared/services/kie-image';
import { resolvePaidAccessState } from '@/shared/services/paid-access';
import { getSeedanceService } from '@/shared/services/seedance';
import { resolveSeedanceEntitlement } from '@/shared/services/seedance-entitlement';

export const maxDuration = 300;

const generateLimiter = rateLimit({
  uniqueTokenPerInterval: 6,
  interval: 60 * 1000,
});

const generatePayloadSchema = z.object({
  provider: z.string().trim().min(1),
  mediaType: z.nativeEnum(AIMediaType),
  model: z.string().trim().min(1),
  prompt: z.string().max(4000).optional().default(''),
  async: z.boolean().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  scene: z.string().trim().optional(),
  notifications: z
    .object({
      notifyOnCompletion: z.boolean().optional(),
      notifyOnCompletionByDefault: z.boolean().optional(),
    })
    .optional(),
});

type GeneratePayload = z.infer<typeof generatePayloadSchema>;
type AIGenerateErrorCode =
  | 'ai_generate_invalid_payload'
  | 'ai_generate_prompt_required'
  | 'ai_generate_provider_unavailable'
  | 'ai_generate_reference_unsupported'
  | 'ai_generate_request_failed'
  | 'ai_generate_insufficient_credits'
  | 'ai_generate_request_processing';
type FriendlyGenerateError = {
  message: string;
  errorCode: AIGenerateErrorCode | null;
};

const AI_GENERATE_IDEMPOTENCY_SCOPE = 'ai-generate';

const buildSeedanceSafetyIdentifier = (user: {
  id: string;
  email?: string | null;
}) => {
  const stableIdentity = [user.id, user.email?.trim().toLowerCase()]
    .filter(Boolean)
    .join(':');

  return createHash('sha256').update(stableIdentity).digest('hex').slice(0, 64);
};

function normalizeBooleanFlag(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return false;
}

function normalizeOptionalBooleanFlag(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return undefined;
}

function getBoundedNumber(
  source: Record<string, unknown>,
  keys: string[],
  options: {
    min: number;
    max: number;
    integer?: boolean;
  }
) {
  for (const key of keys) {
    const parsed = toFiniteNumber(source[key]);
    if (parsed === undefined) {
      continue;
    }

    const normalized = options.integer ? Math.floor(parsed) : parsed;
    return Math.min(options.max, Math.max(options.min, normalized));
  }

  return undefined;
}

function getKieImageUrls(source: Record<string, unknown>) {
  const imageUrls = source.image_urls ?? source.imageUrls;
  if (!Array.isArray(imageUrls)) {
    return [];
  }

  return imageUrls.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  );
}

function normalizeKieImageRequest(input: {
  scene: string;
  model: string;
  prompt: string;
  options?: Record<string, unknown>;
}) {
  if (input.scene !== 'text-to-image' && input.scene !== 'image-to-image') {
    throw new Error('invalid scene');
  }

  const promptResult = normalizeImageGenerationPrompt({
    scene: input.scene,
    prompt: input.prompt,
  });
  if (!promptResult) {
    throw new Error('prompt is required');
  }

  const source = input.options || {};
  const imageUrls = getKieImageUrls(source);
  const imageUrl = imageUrls[0] ?? getFirstImageUrl(source);
  const allImageUrls =
    imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [];

  if (allImageUrls.length > 5) {
    throw new Error('image-to-image supports up to 5 source images.');
  }

  for (const item of allImageUrls) {
    const imageIssue = getReferenceImageUrlIssue(item);
    if (imageIssue) {
      throw new Error(getReferenceImageUrlErrorMessage(imageIssue));
    }
  }

  if (input.scene === 'image-to-image' && !imageUrl) {
    throw new Error('image_url is required for image-to-image requests.');
  }

  const aspectRatio = resolveKieMarketAspectRatio(source) || '1:1';
  const resolution = resolveKieNanoBananaProResolution(source);
  const outputFormat = (resolveKieMarketOutputFormat(source) ||
    'jpg') as KieNanoBananaOutputFormat;
  const webSearch = normalizeBooleanFlag(
    source.google_search ?? source.web_search ?? source.webSearch
  );
  const editMode = toTrimmedString(source.edit_mode ?? source.editMode);
  const defaultModel = getKieImageModel(input.scene as KieImageScene);
  const requestModel =
    input.model.trim() === defaultModel ? undefined : input.model;

  const request: KieImageRequest = {
    scene: input.scene as KieImageScene,
    prompt: promptResult.providerPrompt,
    imageUrl: imageUrl || undefined,
    aspectRatio,
    resolution,
    outputFormat,
    webSearch,
  };

  if (requestModel) {
    request.model = requestModel;
  }

  if (allImageUrls.length > 1) {
    request.imageUrls = allImageUrls;
  }

  if (editMode) {
    request.editMode = editMode;
  }

  const normalizedOptions: Record<string, unknown> = {
    aspect_ratio: aspectRatio,
    resolution,
    output_format: outputFormat,
    web_search: webSearch,
  };

  if (imageUrl) {
    normalizedOptions.image_url = imageUrl;
  }

  if (allImageUrls.length > 1) {
    normalizedOptions.image_urls = allImageUrls;
  }

  if (editMode) {
    normalizedOptions.edit_mode = editMode;
  }

  const seed = getBoundedNumber(source, ['seed'], {
    min: 0,
    max: 2_147_483_647,
    integer: true,
  });
  if (seed !== undefined) {
    request.seed = seed;
    normalizedOptions.seed = seed;
  }

  const negativePrompt = toTrimmedString(
    source.negative_prompt ?? source.negativePrompt
  );
  if (negativePrompt) {
    request.negativePrompt = negativePrompt;
    normalizedOptions.negative_prompt = negativePrompt;
  }

  const guidanceScale = getBoundedNumber(
    source,
    ['guidance_scale', 'guidanceScale'],
    {
      min: 1,
      max: 20,
    }
  );
  if (guidanceScale !== undefined) {
    request.guidanceScale = guidanceScale;
    normalizedOptions.guidance_scale = guidanceScale;
  }

  const numImages = getBoundedNumber(source, ['num_images', 'numImages'], {
    min: 1,
    max: 15,
    integer: true,
  });
  if (numImages !== undefined) {
    request.numImages = numImages;
    normalizedOptions.num_images = numImages;
  }

  const numInferenceSteps = getBoundedNumber(
    source,
    ['num_inference_steps', 'numInferenceSteps'],
    {
      min: 1,
      max: 50,
      integer: true,
    }
  );
  if (numInferenceSteps !== undefined) {
    request.numInferenceSteps = numInferenceSteps;
    normalizedOptions.num_inference_steps = numInferenceSteps;
  }

  const strength = getBoundedNumber(source, ['strength'], {
    min: 0,
    max: 1,
  });
  if (strength !== undefined) {
    request.strength = strength;
    normalizedOptions.strength = strength;
  }

  const nsfwChecker = normalizeOptionalBooleanFlag(
    source.nsfw_checker ?? source.enable_safety_checker ?? source.nsfwChecker
  );
  if (nsfwChecker !== undefined) {
    request.nsfwChecker = nsfwChecker;
    normalizedOptions.nsfw_checker = nsfwChecker;
  }

  return {
    normalizedPrompt: promptResult.normalizedPrompt,
    normalizedOptions,
    request,
    costCredits: getAIGenerationCostCredits(input.scene, {
      resolution,
      model: input.model,
    }),
    telemetry: {
      model: input.model,
      resolution,
      aspectRatio,
      outputFormat,
      webSearch,
      hasImageInput: Boolean(imageUrl),
    },
  };
}

function respAIGenerateErr(
  message: string,
  errorCode: AIGenerateErrorCode,
  status = 200
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

function getAIGenerateErrorCode(raw: string): AIGenerateErrorCode | null {
  const lower = raw.trim().toLowerCase();

  if (lower === 'prompt is required') {
    return 'ai_generate_prompt_required';
  }

  if (lower === 'insufficient credits') {
    return 'ai_generate_insufficient_credits';
  }

  if (lower === 'same generate request is already processing') {
    return 'ai_generate_request_processing';
  }

  if (
    lower === 'invalid generate payload' ||
    lower === 'model is not allowed for this route' ||
    lower === 'invalid scene' ||
    lower === 'invalid mediatype' ||
    lower.startsWith(
      'idempotency key conflicts with a different generate payload'
    )
  ) {
    return 'ai_generate_invalid_payload';
  }

  if (lower.startsWith('same generate request failed recently')) {
    return 'ai_generate_request_failed';
  }

  return null;
}

const toFriendlyGenerateError = (raw: string): FriendlyGenerateError => {
  const message = raw.trim();
  const lower = message.toLowerCase();
  const hasReferenceMediaSignal =
    lower.includes('image') ||
    lower.includes('video') ||
    lower.includes('audio') ||
    lower.includes('url') ||
    lower.includes('download') ||
    lower.includes('fetch');
  const hasProviderPermissionSignal =
    (lower.includes('permission error') ||
      lower.includes('permission denied') ||
      lower.includes('forbidden') ||
      lower.includes('access denied') ||
      lower.includes('not authorized') ||
      lower.includes('unauthorized')) &&
    !hasReferenceMediaSignal;
  const directErrorCode = getAIGenerateErrorCode(message);

  if (directErrorCode) {
    return {
      message,
      errorCode: directErrorCode,
    };
  }

  if (
    message.startsWith('image_url') ||
    message.startsWith('aspect_ratio') ||
    message.startsWith('resolution') ||
    message.startsWith('output_format') ||
    message.startsWith('prompt ') ||
    message.startsWith('image_url ')
  ) {
    return {
      message,
      errorCode: null,
    };
  }

  if (
    lower.includes('provider is not configured') ||
    lower.includes('no seedance providers are configured') ||
    lower.includes('missing credentials:') ||
    lower.includes('temporarily unavailable')
  ) {
    return {
      message:
        'This AI route is temporarily unavailable because an upstream provider is not configured.',
      errorCode: 'ai_generate_provider_unavailable',
    };
  }

  if (hasProviderPermissionSignal) {
    return {
      message:
        'This AI route is temporarily unavailable because an upstream provider rejected the request with a permission error.',
      errorCode: 'ai_generate_provider_unavailable',
    };
  }

  if (
    lower.includes('failed to load the image') ||
    lower.includes('failed to fetch the image') ||
    lower.includes('could not load image') ||
    lower.includes('could not fetch') ||
    lower.includes('failed to fetch') ||
    lower.includes('unsupported image') ||
    lower.includes('cloud-drive') ||
    lower.includes('direct public image')
  ) {
    return {
      message:
        'Reference image URLs must point directly to a public image file. Re-upload the image or use a public JPG/PNG/WEBP/AVIF link.',
      errorCode: null,
    };
  }

  if (lower.includes('real person') || lower.includes('real-person')) {
    return {
      message:
        'Reference media is not supported by the current provider chain. Please replace the input and try again.',
      errorCode: 'ai_generate_reference_unsupported',
    };
  }

  if (
    lower.includes('all studio providers failed') ||
    lower.includes('all seedance providers failed')
  ) {
    return {
      message:
        'All generation providers rejected this request. Try a simpler prompt or reset aspect ratio, duration, and reference image settings.',
      errorCode: null,
    };
  }

  return {
    message: 'Generation could not be completed. Please try again.',
    errorCode: 'ai_generate_request_failed',
  };
};

const generateRouteHandlers = createSecureJsonPostRoute({
  actionName: 'ai-generate-post',
  schema: generatePayloadSchema,
  parseErrorMessage: 'invalid generate payload',
  rateLimit: {
    limiter: generateLimiter,
    keyPrefix: 'ai-generate',
    message: 'too many generate attempts, please slow down',
  },
  async handler({ request, user, body }) {
    let claimedIdempotency: {
      userId: string;
      scope: string;
      key: string;
      storage: 'db' | 'memory';
    } | null = null;
    let requestedProvider: string | null = null;
    let requestedMediaType: AIMediaType | null = null;
    let requestedScene: string | null = null;
    let requestedModel: string | null = null;
    let requestedIdempotencyKey: string | null = null;
    let resolvedProvider: string | null = null;
    let failureStep = 'parse-request';

    try {
      const {
        provider,
        mediaType,
        model,
        prompt = '',
        options,
        scene: rawScene,
        async: asyncFlag,
        notifications,
      } = body as GeneratePayload;
      requestedProvider = provider;
      requestedMediaType = mediaType;
      requestedModel = model;

      let finalModel = model;
      const scene = rawScene || '';
      requestedScene = scene;
      const requestContext = resolveRequestContext(request.headers, {
        path: '/api/ai/generate',
      });
      const notifyOnCompletion =
        notifications?.notifyOnCompletion === true ||
        notifications?.notifyOnCompletionByDefault === true;
      const notifyOnCompletionByDefault =
        notifications?.notifyOnCompletionByDefault;
      failureStep = 'validate-request';

      if (!findAIModelRule({ provider, mediaType, model, scene })) {
        return respAIGenerateErr(
          'model is not allowed for this route',
          'ai_generate_invalid_payload'
        );
      }

      let costCredits = 0;
      let normalizedOptions = options as Record<string, unknown> | undefined;
      let normalizedPrompt = prompt;
      let seedanceRequest: Awaited<
        ReturnType<typeof normalizeSeedanceRequest>
      > | null = null;
      let kieImageRequest: KieImageRequest | null = null;
      let paidAccess: Awaited<ReturnType<typeof resolvePaidAccessState>> | null =
        null;
      let generationTelemetry: Record<string, unknown> = {};

      if (mediaType === AIMediaType.VIDEO) {
        if (
          scene !== 'image-to-video' &&
          scene !== 'text-to-video' &&
          scene !== 'reference-to-video'
        ) {
          return respAIGenerateErr(
            'invalid scene',
            'ai_generate_invalid_payload'
          );
        }
      } else if (mediaType === AIMediaType.IMAGE) {
        if (scene !== 'text-to-image' && scene !== 'image-to-image') {
          return respAIGenerateErr(
            'invalid scene',
            'ai_generate_invalid_payload'
          );
        }
      } else {
        return respAIGenerateErr(
          'invalid mediaType',
          'ai_generate_invalid_payload'
        );
      }

      try {
        if (mediaType === AIMediaType.VIDEO) {
          if (
            scene !== 'text-to-video' &&
            scene !== 'image-to-video' &&
            scene !== 'reference-to-video'
          ) {
            return respAIGenerateErr(
              'invalid scene',
              'ai_generate_invalid_payload'
            );
          }

          const videoScene = scene as SeedanceScene;

          seedanceRequest = normalizeSeedanceRequest({
            scene: videoScene,
            prompt,
            options: normalizedOptions,
          });
          const seedanceEntitlement = await resolveSeedanceEntitlement(user.id);
          normalizedPrompt = seedanceRequest.prompt;
          seedanceRequest = {
            ...seedanceRequest,
            safetyIdentifier: buildSeedanceSafetyIdentifier(user),
            watermark: seedanceEntitlement.watermark,
          };
          await assertStorageBackedSeedanceVideoFormats(seedanceRequest);
          normalizedOptions = {
            fast: seedanceRequest.fast,
            duration: seedanceRequest.duration,
            execution_expires_after: seedanceRequest.executionExpiresAfter,
            resolution: seedanceRequest.resolution,
            aspect_ratio: seedanceRequest.aspectRatio,
            generate_audio: seedanceRequest.generateAudio,
            web_search: seedanceRequest.webSearch,
            safety_identifier: seedanceRequest.safetyIdentifier,
            watermark: seedanceRequest.watermark,
            return_last_frame: seedanceRequest.returnLastFrame,
            seed: seedanceRequest.seed,
            image_urls: seedanceRequest.imageUrls,
            video_urls: seedanceRequest.videoUrls,
            audio_urls: seedanceRequest.audioUrls,
          };
          costCredits = getAIGenerationCostCredits(scene, {
            durationSeconds: seedanceRequest.duration,
            resolution: seedanceRequest.resolution,
            fast: seedanceRequest.fast,
            webSearch: seedanceRequest.webSearch,
            hasVideoInput: seedanceRequest.videoUrls.length > 0,
          });
          generationTelemetry = {
            fast: seedanceRequest.fast,
            durationSeconds: seedanceRequest.duration,
            resolution: seedanceRequest.resolution,
            aspectRatio: seedanceRequest.aspectRatio,
            webSearch: seedanceRequest.webSearch,
            hasImageInput: seedanceRequest.imageUrls.length > 0,
            hasVideoInput: seedanceRequest.videoUrls.length > 0,
            hasAudioInput: seedanceRequest.audioUrls.length > 0,
          };
        } else {
          const normalizedImageInput = normalizeKieImageRequest({
            scene,
            model: finalModel,
            prompt,
            options: normalizedOptions,
          });
          normalizedPrompt = normalizedImageInput.normalizedPrompt;
          normalizedOptions = normalizedImageInput.normalizedOptions;
          kieImageRequest = normalizedImageInput.request;
          costCredits = normalizedImageInput.costCredits;
          generationTelemetry = normalizedImageInput.telemetry;
        }
      } catch (error) {
        if (error instanceof Error) {
          const errorCode = getAIGenerateErrorCode(error.message);
          if (errorCode) {
            return respAIGenerateErr(error.message, errorCode);
          }

          return respErr(error.message);
        }

        throw error;
      }

      if (mediaType === AIMediaType.IMAGE) {
        paidAccess = await resolvePaidAccessState(user.id).catch((error) => {
          console.warn('[ai/generate] paid access state degraded', {
            userId: user.id,
            mediaType,
            scene,
            model: finalModel,
            step: 'resolve-paid-access-state',
            error,
          });

          return null;
        });

        const kieTier = paidAccess?.tier ?? 'free';
        if (!canUseImageModel(finalModel, kieTier)) {
          console.warn('[ai/generate] blocked VIP image model for non-paid user', {
            userId: user.id,
            mediaType,
            scene,
            model: finalModel,
            step: 'require-paid-image-model-access',
            tier: kieTier,
          });

          return respAIGenerateErr(
            'upgrade required for VIP image models',
            'ai_generate_invalid_payload'
          );
        }
      }

      const remainingCredits = await getRemainingCredits(user.id);
      if (remainingCredits < costCredits) {
        return respAIGenerateErr(
          'insufficient credits',
          'ai_generate_insufficient_credits'
        );
      }

      const isAsync = asyncFlag === false ? false : true;

      const idempotencyKey = normalizeAIGenerateIdempotencyKey(
        request.headers.get('idempotency-key') ||
          request.headers.get('x-idempotency-key')
      );
      requestedIdempotencyKey = idempotencyKey || null;
      if (idempotencyKey) {
        const requestHash = await createAIGenerateRequestHash({
          provider,
          mediaType,
          model: finalModel,
          prompt: normalizedPrompt,
          scene,
          options: normalizedOptions || null,
          async: isAsync,
        });

        try {
          const claim = await claimAIGenerateIdempotency({
            userId: user.id,
            scope: AI_GENERATE_IDEMPOTENCY_SCOPE,
            idempotencyKey,
            requestHash,
          });

          if (claim.kind === 'existing') {
            if (claim.record.requestHash !== requestHash) {
              return respAIGenerateErr(
                'idempotency key conflicts with a different generate payload',
                'ai_generate_invalid_payload'
              );
            }

            if (claim.record.status === AIGenerateIdempotencyStatus.COMPLETED) {
              const cachedPayload = parseAIGenerateIdempotencyResponse(
                claim.record.responsePayload
              );
              if (cachedPayload) {
                return respData(cachedPayload);
              }
            }

            if (
              claim.record.status === AIGenerateIdempotencyStatus.PROCESSING
            ) {
              return respAIGenerateErr(
                'same generate request is already processing',
                'ai_generate_request_processing',
                409
              );
            }

            return respAIGenerateErr(
              claim.record.errorMessage ||
                'same generate request failed recently, retry with a new idempotency key',
              'ai_generate_request_failed'
            );
          }

          claimedIdempotency = {
            userId: user.id,
            scope: AI_GENERATE_IDEMPOTENCY_SCOPE,
            key: idempotencyKey,
            storage: 'db',
          };
        } catch (error) {
          if (!isAIGenerateIdempotencyStorageError(error)) {
            throw error;
          }

          console.warn('[ai/generate] idempotency storage degraded to memory', {
            userId: user.id,
            idempotencyKey,
            error,
          });

          const claim = claimAIGenerateMemoryIdempotency({
            userId: user.id,
            scope: AI_GENERATE_IDEMPOTENCY_SCOPE,
            idempotencyKey,
            requestHash,
          });

          if (claim.kind === 'existing') {
            if (claim.record.requestHash !== requestHash) {
              return respAIGenerateErr(
                'idempotency key conflicts with a different generate payload',
                'ai_generate_invalid_payload'
              );
            }

            if (claim.record.status === AIGenerateIdempotencyStatus.COMPLETED) {
              if (claim.record.responsePayload) {
                return respData(claim.record.responsePayload);
              }
            }

            if (
              claim.record.status === AIGenerateIdempotencyStatus.PROCESSING
            ) {
              return respAIGenerateErr(
                'same generate request is already processing',
                'ai_generate_request_processing',
                409
              );
            }

            return respAIGenerateErr(
              claim.record.errorMessage ||
                'same generate request failed recently, retry with a new idempotency key',
              'ai_generate_request_failed'
            );
          }

          claimedIdempotency = {
            userId: user.id,
            scope: AI_GENERATE_IDEMPOTENCY_SCOPE,
            key: idempotencyKey,
            storage: 'memory',
          };
        }
      }

      const kieTier =
        mediaType === AIMediaType.IMAGE
          ? (paidAccess?.tier ?? 'free')
          : undefined;

      let dispatchResult;
      if (mediaType === AIMediaType.VIDEO) {
        const seedanceService = await getSeedanceService();
        failureStep = 'seedance.generate';
        dispatchResult = await seedanceService.generate({
          request: seedanceRequest!,
          callbackUrlForProvider: isAsync
            ? (providerName) =>
                buildSeedanceCallbackUrl({
                  appUrl: envConfigs.app_url,
                  provider: providerName,
                })
            : undefined,
        });
      } else {
        const kieImageService = await getKieImageService();
        failureStep = 'kie-image.generate';
        dispatchResult = await kieImageService.generate({
          request: kieImageRequest!,
          tier: kieTier as 'paid' | 'free',
        });
      }
      resolvedProvider = dispatchResult.provider;
      finalModel = dispatchResult.model;
      const result = dispatchResult.result;

      if (!result?.taskId) {
        return respAIGenerateErr(
          'Generation could not be completed. Please try again.',
          'ai_generate_request_failed'
        );
      }

      const newAITask: NewAITask = {
        id: getUuid(),
        userId: user.id,
        mediaType,
        provider: resolvedProvider,
        model: finalModel,
        prompt: normalizedPrompt,
        scene,
        options: normalizedOptions || null,
        status: result.taskStatus,
        costCredits,
        taskId: result.taskId,
        taskInfo: normalizeJsonbInput(result.taskInfo),
        taskResult: normalizeJsonbInput(result.taskResult),
        completionNotificationRequested: notifyOnCompletion,
        completionNotificationLocale: requestContext.locale || null,
      };
      failureStep = 'persist-ai-task';
      await createAITask(newAITask);
      await safeRecordUserContextEvent({
        userId: user.id,
        eventType: 'ai_generate',
        ...requestContext,
        metadata: {
          taskId: newAITask.id,
          provider: resolvedProvider,
          requestedProvider: provider,
          mediaType,
          model: finalModel,
          scene,
          costCredits,
          ...generationTelemetry,
        },
      });

      if (newAITask.status === AITaskStatus.SUCCESS) {
        await recordFirstSuccessfulGeneration({
          task: newAITask,
          source: 'generate',
          requestContext,
        });

        after(async () => {
          await syncAITaskUserNotifications({
            task: newAITask,
            user,
          });
        });
      }

      if (typeof notifyOnCompletionByDefault === 'boolean') {
        try {
          await upsertUserNotificationPreference({
            userId: user.id,
            aiTaskCompletionEmailEnabled: notifyOnCompletionByDefault,
          });
        } catch (notificationPreferenceError) {
          console.warn('[ai/generate] failed to save notification preference', {
            userId: user.id,
            notifyOnCompletionByDefault,
            error: notificationPreferenceError,
          });
        }
      }

      const taskInfoObj =
        parseDbJsonValue<Record<string, unknown>>(result.taskInfo) || {};
      const responsePayload = {
        ...newAITask,
        taskInfo: taskInfoObj,
        statusUrl:
          (taskInfoObj.statusUrl as string | undefined) ||
          (taskInfoObj.status_url as string | undefined),
        responseUrl:
          (taskInfoObj.responseUrl as string | undefined) ||
          (taskInfoObj.response_url as string | undefined),
      };

      if (claimedIdempotency) {
        try {
          if (claimedIdempotency.storage === 'db') {
            await completeAIGenerateIdempotency({
              userId: claimedIdempotency.userId,
              scope: claimedIdempotency.scope,
              idempotencyKey: claimedIdempotency.key,
              aiTaskId: newAITask.id,
              responsePayload,
            });
          } else {
            completeAIGenerateMemoryIdempotency({
              userId: claimedIdempotency.userId,
              scope: claimedIdempotency.scope,
              idempotencyKey: claimedIdempotency.key,
              responsePayload,
            });
          }
        } catch (error) {
          console.warn('[ai/generate] failed to complete idempotency record', {
            userId: claimedIdempotency.userId,
            idempotencyKey: claimedIdempotency.key,
            error,
          });
          if (isAIGenerateIdempotencyStorageError(error)) {
            completeAIGenerateMemoryIdempotency({
              userId: claimedIdempotency.userId,
              scope: claimedIdempotency.scope,
              idempotencyKey: claimedIdempotency.key,
              responsePayload,
            });
          }
        }
      }

      return respData(responsePayload);
    } catch (error) {
      console.error('[ai/generate] failed', {
        userId: user?.id ?? null,
        requestedProvider,
        resolvedProvider,
        mediaType: requestedMediaType,
        scene: requestedScene,
        model: requestedModel,
        step: failureStep,
        idempotencyKey: requestedIdempotencyKey,
        error: error instanceof Error ? error.message : String(error),
      });
      const friendly =
        error instanceof Error && error.message
          ? toFriendlyGenerateError(error.message)
          : {
              message: 'Generation could not be completed. Please try again.',
              errorCode: 'ai_generate_request_failed' as const,
            };

      if (claimedIdempotency) {
        try {
          if (claimedIdempotency.storage === 'db') {
            await failAIGenerateIdempotency({
              userId: claimedIdempotency.userId,
              scope: claimedIdempotency.scope,
              idempotencyKey: claimedIdempotency.key,
              errorMessage: friendly.message,
            });
          } else {
            failAIGenerateMemoryIdempotency({
              userId: claimedIdempotency.userId,
              scope: claimedIdempotency.scope,
              idempotencyKey: claimedIdempotency.key,
              errorMessage: friendly.message,
            });
          }
        } catch (idempotencyError) {
          console.warn(
            '[ai/generate] failed to mark idempotency record failed',
            {
              userId: claimedIdempotency.userId,
              idempotencyKey: claimedIdempotency.key,
              error: idempotencyError,
            }
          );
          if (isAIGenerateIdempotencyStorageError(idempotencyError)) {
            failAIGenerateMemoryIdempotency({
              userId: claimedIdempotency.userId,
              scope: claimedIdempotency.scope,
              idempotencyKey: claimedIdempotency.key,
              errorMessage: friendly.message,
            });
          }
        }
      }

      if (friendly.errorCode) {
        return respAIGenerateErr(friendly.message, friendly.errorCode);
      }

      return respErr(friendly.message);
    }
  },
});

export const { OPTIONS, POST } = generateRouteHandlers;
