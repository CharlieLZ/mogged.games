import { after } from 'next/server';

import {
  detectMediaTypeFromUrl,
  extractResultUrls,
} from '@/extensions/ai/provider-utils';
import { isSeedanceProviderName } from '@/extensions/ai/seedance/capability';
import { AITaskResult, AITaskStatus } from '@/extensions/ai/types';
import { sendErrorNotification } from '@/extensions/notification';
import { normalizeJsonbInput, parseDbJsonRecord } from '@/shared/lib/db-json';
import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskByProviderTaskId,
  updateAITaskById,
  type UpdateAITask,
} from '@/shared/models/ai_task';
import { findUserById } from '@/shared/models/user';
import { isLegacyProviderRetiredTask } from '@/shared/services/ai-legacy';
import { recordFirstSuccessfulGeneration } from '@/shared/services/funnel-observability';
import { syncAITaskUserNotifications } from '@/shared/services/ai-task-user-notifications';
import { getSeedanceService } from '@/shared/services/seedance';

function isTerminalStatus(status?: string) {
  return (
    status === AITaskStatus.SUCCESS ||
    status === AITaskStatus.FAILED ||
    status === AITaskStatus.CANCELED
  );
}

function shouldDowngradeStatus(
  current: string | null | undefined,
  next: AITaskStatus
) {
  if (!current) return false;
  if (!isTerminalStatus(current)) return false;
  return !isTerminalStatus(next);
}

function hasFinalSuccessResult(task: {
  status?: string | null;
  taskInfo?: unknown;
  taskResult?: unknown;
}) {
  return (
    task.status === AITaskStatus.SUCCESS && !!task.taskInfo && !!task.taskResult
  );
}

function shouldIgnoreLateNonSuccessUpdate(
  task: {
    status?: string | null;
    taskInfo?: unknown;
    taskResult?: unknown;
  },
  nextStatus?: AITaskStatus
) {
  return hasFinalSuccessResult(task) && nextStatus !== AITaskStatus.SUCCESS;
}

function collectWebhookMediaUrls(
  source: unknown,
  imageUrls: Set<string>,
  videoUrls: Set<string>
) {
  for (const url of extractResultUrls(source)) {
    if (detectMediaTypeFromUrl(url) === 'video') {
      videoUrls.add(url);
      continue;
    }

    imageUrls.add(url);
  }
}

function buildWebhookFallbackUpdate(bodyObj: Record<string, unknown>): {
  status?: AITaskStatus;
  taskInfo: Record<string, unknown>;
  taskResult: Record<string, unknown>;
} {
  const rawStatus = (
    (bodyObj.status as string | undefined) ||
    (bodyObj.taskStatus as string | undefined) ||
    (bodyObj.state as string | undefined) ||
    ''
  ).toString();

  const mappedStatus = mapStatus(rawStatus);

  const taskInfo: Record<string, unknown> = {};
  if (rawStatus) {
    taskInfo.status = rawStatus;
  }

  const output = bodyObj.output;
  const imageUrls = new Set<string>();
  const videoUrls = new Set<string>();

  if (Array.isArray(output)) {
    collectWebhookMediaUrls(output, imageUrls, videoUrls);
  }

  if (bodyObj.content !== undefined) {
    collectWebhookMediaUrls(bodyObj.content, imageUrls, videoUrls);
  }

  if (isRecord(bodyObj.data) && bodyObj.data.content !== undefined) {
    collectWebhookMediaUrls(bodyObj.data.content, imageUrls, videoUrls);
  }

  if (imageUrls.size > 0) {
    taskInfo.images = [...imageUrls].map((url) => ({
      imageUrl: url,
    }));
  }

  if (videoUrls.size > 0) {
    taskInfo.videos = [...videoUrls].map((url) => ({
      videoUrl: url,
    }));
  }

  if (bodyObj.error || bodyObj.errorMessage) {
    taskInfo.errorMessage = String(bodyObj.error || bodyObj.errorMessage);
  }

  return {
    status: mappedStatus,
    taskInfo,
    taskResult: bodyObj,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const startTime = Date.now();
  let provider: string | undefined;
  let taskId: string | undefined;

  try {
    const resolvedParams = await params;
    provider = resolvedParams?.provider?.toLowerCase();

    if (!provider) {
      return respErr('provider is required');
    }

    const rawBody = await req.text();
    console.log('[Webhook] Received:', {
      provider,
      bodyLength: rawBody?.length || 0,
      timestamp: new Date().toISOString(),
    });

    let body: unknown = {};
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        console.warn('[Webhook] JSON parse failed, using raw body');
        // Return success to avoid FAL thinking webhook failed
        return respData({
          received: true,
          warning: 'payload not valid JSON',
        });
      }
    }

    const bodyObj = isRecord(body) ? body : {};

    const rawTaskId =
      (bodyObj.taskId as string | undefined) ||
      (bodyObj.task_id as string | undefined) ||
      (bodyObj.request_id as string | undefined) ||
      (bodyObj.requestId as string | undefined) ||
      (bodyObj.id as string | undefined) ||
      (isRecord(bodyObj.data)
        ? (bodyObj.data.id as string | undefined)
        : undefined) ||
      (isRecord(bodyObj.data)
        ? (bodyObj.data.task_id as string | undefined)
        : undefined) ||
      (isRecord(bodyObj.data)
        ? (bodyObj.data.request_id as string | undefined) ||
          (bodyObj.data.requestId as string | undefined)
        : undefined) ||
      (isRecord(bodyObj.data)
        ? (bodyObj.data.taskId as string | undefined)
        : undefined) ||
      (isRecord(bodyObj.prediction)
        ? (bodyObj.prediction.id as string | undefined) ||
          (bodyObj.prediction.request_id as string | undefined) ||
          (bodyObj.prediction.requestId as string | undefined)
        : undefined);

    taskId = typeof rawTaskId === 'string' ? rawTaskId : undefined;

    if (!taskId) {
      console.warn('[Webhook] taskId not found in payload');
      // Return success to avoid FAL thinking webhook failed
      return respData({
        received: true,
        warning: 'taskId not found',
      });
    }

    console.log('[Webhook] Processing:', { provider, taskId });

    // 先做一次“最小同步落库”，避免 after() 在某些环境不执行导致任务永远 processing
    try {
      const task = await findAITaskByProviderTaskId({ provider, taskId });
      if (task) {
        if (
          !isSeedanceProviderName(task.provider) &&
          isLegacyProviderRetiredTask(task)
        ) {
          console.log('[Webhook] Ignoring webhook for retired legacy task:', {
            taskId: task.id,
            provider,
          });
          return respData({
            received: true,
            ignored: true,
            reason: 'legacy_provider_retired',
          });
        }

        const fallback = buildWebhookFallbackUpdate(bodyObj);
        const updatePayload: UpdateAITask = {};
        const seedanceService = isSeedanceProviderName(task.provider)
          ? await getSeedanceService()
          : null;
        const protectedFinalSuccess = shouldIgnoreLateNonSuccessUpdate(
          task,
          fallback.status
        );
        const terminalFailureWithFallback =
          fallback.status &&
          isTerminalStatus(fallback.status) &&
          (seedanceService
            ? seedanceService.shouldAttemptFallback({
                task: {
                  id: task.id,
                  scene: task.scene,
                  provider: task.provider,
                  model: task.model,
                  prompt: task.prompt,
                  options: task.options,
                  taskInfo: fallback.taskInfo,
                  taskResult: fallback.taskResult,
                },
              })
            : false);

        if (
          fallback.status &&
          !protectedFinalSuccess &&
          !shouldDowngradeStatus(task.status, fallback.status) &&
          !terminalFailureWithFallback
        ) {
          updatePayload.status = fallback.status;
        }

        // 避免把已经写好的最终结果覆盖掉（比如重复 webhook / out-of-order）
        const hasFinalResult =
          task.status === AITaskStatus.SUCCESS &&
          !!task.taskInfo &&
          !!task.taskResult;

        if (!hasFinalResult && !protectedFinalSuccess) {
          const mergedTaskInfo = seedanceService
            ? seedanceService.attachExistingTrace({
                taskInfo: parseDbJsonRecord(task.taskInfo) || {},
                nextTaskInfo: fallback.taskInfo,
                provider: task.provider as any,
                model: task.model || '',
              })
            : fallback.taskInfo;

          updatePayload.taskInfo = normalizeJsonbInput(mergedTaskInfo);
          updatePayload.taskResult = normalizeJsonbInput(fallback.taskResult);
        } else if (!task.taskInfo) {
          updatePayload.taskInfo = normalizeJsonbInput(fallback.taskInfo);
        }

        if (Object.keys(updatePayload).length > 0) {
          await updateAITaskById(task.id, updatePayload);
          console.log('[Webhook] Fast update saved:', {
            taskId: task.id,
            status: updatePayload.status,
          });
        }
      }
    } catch (error) {
      console.error('[Webhook] Fast update failed:', {
        provider,
        taskId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Capture values for closure (TypeScript needs these to be non-undefined)
    const finalProvider = provider;
    const finalTaskId = taskId;

    // Use after() to ensure async processing completes even after response is sent
    // This is critical for Serverless environments where functions are frozen after response
    after(async () => {
      try {
        await processWebhookAsync(
          finalProvider,
          finalTaskId,
          bodyObj,
          startTime
        );
      } catch (err) {
        console.error('[Webhook After] Failed:', {
          provider: finalProvider,
          taskId: finalTaskId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    // Return immediately to avoid timeout
    return respData({
      received: true,
      provider,
      task_id: taskId,
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const duration = Date.now() - startTime;
    console.error('[Webhook] Immediate error:', {
      provider,
      taskId,
      duration,
      error: e instanceof Error ? e.message : String(e),
    });
    // Return success even with errors to avoid FAL thinking webhook failed
    return respData({
      received: true,
      warning: 'processed with errors',
      error: e instanceof Error ? e.message : 'unknown error',
    });
  }
}

async function processWebhookAsync(
  provider: string,
  taskId: string,
  bodyObj: Record<string, unknown>,
  startTime: number
) {
  try {
    const task = await findAITaskByProviderTaskId({ provider, taskId });
    if (!task) {
      console.warn('[Webhook Async] Task not found:', { provider, taskId });
      return;
    }

    if (
      !isSeedanceProviderName(task.provider) &&
      isLegacyProviderRetiredTask(task)
    ) {
      console.log('[Webhook Async] Ignoring retired legacy task:', {
        taskId: task.id,
        provider,
      });
      return;
    }

    console.log('[Webhook Async] Found task:', task.id);

    // Prefer provider query for authoritative status/result
    let providerResult: AITaskResult | null = null;
    const isSeedanceTask = isSeedanceProviderName(provider);
    const seedanceService = isSeedanceTask ? await getSeedanceService() : null;
    if (seedanceService) {
      try {
        providerResult = seedanceService
          ? await seedanceService.query({
              provider: provider as any,
              taskId,
              model: task.model || undefined,
            })
          : null;

        if (providerResult?.taskInfo && seedanceService) {
          providerResult.taskInfo = seedanceService.attachExistingTrace({
            taskInfo: parseDbJsonRecord(task.taskInfo) || {},
            nextTaskInfo: providerResult.taskInfo,
            provider: provider as any,
            model: task.model || '',
          }) as any;
        }
        console.log('[Webhook Async] Query result:', {
          taskId,
          status: providerResult?.taskStatus,
        });
      } catch (error) {
        console.error('[Webhook Async] Provider query failed:', {
          provider,
          taskId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const updatePayload: UpdateAITask = {};
    const fallbackTaskInfo = parseDbJsonRecord(task.taskInfo) || {};
    const fallbackTaskResult = parseDbJsonRecord(task.taskResult) || {};
    let nextStatus: AITaskStatus | undefined;
    let errorDetails: {
      errorMessage?: string;
      errorCode?: string;
      apiEndpoint?: string;
    } = extractErrorDetails(fallbackTaskInfo, fallbackTaskResult);

    if (providerResult) {
      if (!shouldDowngradeStatus(task.status, providerResult.taskStatus)) {
        updatePayload.status = providerResult.taskStatus;
      }

      nextStatus = normalizeTaskStatus(
        updatePayload.status,
        providerResult.taskStatus
      );
      errorDetails = mergeErrorDetails(
        errorDetails,
        extractErrorDetails(providerResult.taskInfo, providerResult.taskResult)
      );

      // 只要 provider 有返回，就尽量用它覆盖（但也别在 downgrade 场景把已有结果抹掉）
      const canOverwriteResult =
        !isTerminalStatus(task.status) ||
        providerResult.taskStatus === AITaskStatus.SUCCESS ||
        providerResult.taskStatus === AITaskStatus.FAILED ||
        providerResult.taskStatus === AITaskStatus.CANCELED;

      if (providerResult.taskInfo && canOverwriteResult) {
        updatePayload.taskInfo = providerResult.taskInfo;
      }
      if (providerResult.taskResult && canOverwriteResult) {
        updatePayload.taskResult = providerResult.taskResult;
      }
    } else {
      // Fallback to webhook payload
      const fallback = buildWebhookFallbackUpdate(bodyObj);

      if (
        fallback.status &&
        !shouldDowngradeStatus(task.status, fallback.status)
      ) {
        updatePayload.status = fallback.status;
      }

      nextStatus = normalizeTaskStatus(updatePayload.status, fallback.status);
      errorDetails = mergeErrorDetails(
        errorDetails,
        extractErrorDetails(fallback.taskInfo, fallback.taskResult),
        extractErrorDetails(undefined, bodyObj)
      );

      const hasFinalResult =
        task.status === AITaskStatus.SUCCESS &&
        !!task.taskInfo &&
        !!task.taskResult;

      if (!hasFinalResult) {
        updatePayload.taskInfo = seedanceService
          ? seedanceService.attachExistingTrace({
              taskInfo: parseDbJsonRecord(task.taskInfo) || {},
              nextTaskInfo: fallback.taskInfo,
              provider: provider as any,
              model: task.model || '',
            })
          : fallback.taskInfo;
        updatePayload.taskResult = fallback.taskResult;
      }
    }

    if (shouldIgnoreLateNonSuccessUpdate(task, nextStatus)) {
      console.log('[Webhook Async] Preserving successful terminal task:', {
        taskId: task.id,
        currentStatus: task.status,
        nextStatus,
      });
      return;
    }

    if (Object.keys(updatePayload).length === 0) {
      console.log('[Webhook Async] No changes to apply:', {
        taskId: task.id,
      });
      return;
    }

    if (
      nextStatus === AITaskStatus.FAILED ||
      nextStatus === AITaskStatus.CANCELED
    ) {
      const fallback = seedanceService
        ? await seedanceService.retryWithFallback({
            task: {
              id: task.id,
              scene: task.scene,
              provider: task.provider,
              model: task.model,
              prompt: task.prompt,
              options: task.options,
              taskInfo:
                updatePayload.taskInfo ??
                providerResult?.taskInfo ??
                task.taskInfo,
              taskResult:
                updatePayload.taskResult ??
                providerResult?.taskResult ??
                task.taskResult,
            },
            loggerLabel: 'ai/notify',
          })
        : null;

      if (fallback) {
        await updateAITaskById(task.id, {
          provider: fallback.provider,
          model: fallback.model,
          taskId: fallback.taskId,
          status: fallback.status,
          taskInfo: fallback.taskInfo ?? null,
          taskResult: fallback.taskResult ?? null,
          creditId: task.creditId || undefined,
        });
        return;
      }
    }

    await updateAITaskById(task.id, updatePayload);

    if (nextStatus === AITaskStatus.SUCCESS) {
      await recordFirstSuccessfulGeneration({
        task: {
          ...task,
          ...updatePayload,
        },
        source: 'notify',
      });
    }

    if (
      nextStatus === AITaskStatus.SUCCESS ||
      nextStatus === AITaskStatus.FAILED ||
      nextStatus === AITaskStatus.CANCELED
    ) {
      await syncAITaskUserNotifications({
        task: {
          ...task,
          ...updatePayload,
          status: nextStatus,
          taskInfo: updatePayload.taskInfo ?? task.taskInfo,
          taskResult: updatePayload.taskResult ?? task.taskResult,
        },
      });
    }

    const shouldNotifyError =
      !isTerminalStatus(task.status) &&
      (nextStatus === AITaskStatus.FAILED ||
        nextStatus === AITaskStatus.CANCELED);

    // 记录通知判断条件，便于排查
    console.log('[Webhook Async] Notification check:', {
      taskId: task.id,
      currentStatus: task.status,
      nextStatus,
      isCurrentTerminal: isTerminalStatus(task.status),
      shouldNotify: shouldNotifyError,
    });

    if (shouldNotifyError) {
      try {
        const user = await findUserById(task.userId);
        console.log('[Feishu] Sending error notification:', {
          taskId,
          email: user?.email,
          errorMessage: errorDetails.errorMessage?.slice(0, 100),
        });
        const result = await sendErrorNotification({
          email: user?.email,
          name: user?.name,
          apiEndpoint: errorDetails.apiEndpoint,
          apiProvider: provider,
          errorCode: errorDetails.errorCode,
          errorMessage: errorDetails.errorMessage,
          prompt: task.prompt,
          type: buildTaskType(task),
          taskId,
        });
        console.log('[Feishu] Notification result:', result);
      } catch (notifyErr) {
        console.error('[Feishu] error notification failed', notifyErr);
      }
    }

    const duration = Date.now() - startTime;
    console.log('[Webhook Async] Success:', {
      taskId: task.id,
      status: updatePayload.status,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Webhook Async] Processing failed:', {
      provider,
      taskId,
      duration,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractErrorDetails(
  taskInfo?: unknown,
  taskResult?: unknown
): {
  errorMessage?: string;
  errorCode?: string;
  apiEndpoint?: string;
} {
  const info = isRecord(taskInfo) ? taskInfo : {};
  const result = isRecord(taskResult) ? taskResult : {};

  const errorMessage =
    getString(info.errorMessage) ||
    getString(info.error_message) ||
    getString(result.errorMessage) ||
    getString(result.error_message) ||
    getString(result.error) ||
    getString(result.message);

  const errorCode =
    getString(info.errorCode) ||
    getString(info.error_code) ||
    getString(result.errorCode) ||
    getString(result.error_code) ||
    getString(result.code);

  const apiEndpoint =
    getString(info.responseUrl) ||
    getString(info.response_url) ||
    getString(info.statusUrl) ||
    getString(info.status_url) ||
    getString(info.url) ||
    getString(result.responseUrl) ||
    getString(result.response_url) ||
    getString(result.statusUrl) ||
    getString(result.status_url) ||
    getString(result.url);

  return { errorMessage, errorCode, apiEndpoint };
}

function mergeErrorDetails(
  base: { errorMessage?: string; errorCode?: string; apiEndpoint?: string },
  ...incoming: Array<{
    errorMessage?: string;
    errorCode?: string;
    apiEndpoint?: string;
  }>
) {
  let merged = { ...base };
  for (const next of incoming) {
    merged = {
      errorMessage: merged.errorMessage || next.errorMessage,
      errorCode: merged.errorCode || next.errorCode,
      apiEndpoint: merged.apiEndpoint || next.apiEndpoint,
    };
  }
  return merged;
}

function getString(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function buildTaskType(task: {
  mediaType?: string | null;
  scene?: string | null;
  model?: string | null;
}) {
  const parts = [task.mediaType, task.scene, task.model].filter(Boolean);
  return parts.join(' | ') || '-';
}

function normalizeTaskStatus(
  status?: string | null,
  fallback?: AITaskStatus
): AITaskStatus | undefined {
  if (!status) return fallback;
  const mapped = mapStatus(status);
  return mapped || fallback;
}

function mapStatus(status: string): AITaskStatus | undefined {
  const value = status?.toLowerCase();
  switch (value) {
    case 'pending':
    case 'starting':
    case 'queued':
    case 'in_queue':
      return AITaskStatus.PENDING;
    case 'processing':
    case 'running':
    case 'in_progress':
      return AITaskStatus.PROCESSING;
    case 'success':
    case 'succeeded':
    case 'completed':
    case 'complete':
      return AITaskStatus.SUCCESS;
    case 'failed':
    case 'error':
    case 'expired':
      return AITaskStatus.FAILED;
    case 'canceled':
    case 'cancelled':
      return AITaskStatus.CANCELED;
    default:
      return undefined;
  }
}
