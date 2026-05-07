import { after } from 'next/server';
import { z } from 'zod';

import { isKieImageProvider } from '@/extensions/ai/kie-market/types';
import { isSeedanceProviderName } from '@/extensions/ai/seedance/capability';
import { AITaskStatus } from '@/extensions/ai/types';
import { sendErrorNotification } from '@/extensions/notification';
import { rateLimit } from '@/shared/lib/api/rate-limit';
import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { parseDbJsonValue, stringifyDbJsonValue } from '@/shared/lib/db-json';
import { resolveRequestContext } from '@/shared/lib/request-context';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import {
  findAITaskById,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getCurrentSubscription } from '@/shared/models/subscription';
import {
  buildLegacyProviderRetiredUpdate,
  isActiveAITaskStatus,
} from '@/shared/services/ai-legacy';
import { syncAITaskUserNotifications } from '@/shared/services/ai-task-user-notifications';
import { recordFirstSuccessfulGeneration } from '@/shared/services/funnel-observability';
import { getKieImageService } from '@/shared/services/kie-image';
import { getSeedanceService } from '@/shared/services/seedance';

type QueryPayload = {
  taskId: string;
};

const queryLimiter = rateLimit({
  uniqueTokenPerInterval: 120,
  interval: 60 * 1000,
});

const queryPayloadSchema = z.object({
  taskId: z.string().trim().min(1),
});

function isTerminalStatus(status?: string | null) {
  return (
    status === AITaskStatus.SUCCESS ||
    status === AITaskStatus.FAILED ||
    status === AITaskStatus.CANCELED
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function extractErrorDetails(taskInfo: unknown, taskResult: unknown) {
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
    getString(result.url);

  return { errorMessage, errorCode, apiEndpoint };
}

function buildTaskType(task: {
  mediaType?: string | null;
  scene?: string | null;
  model?: string | null;
}) {
  const parts = [task.mediaType, task.scene, task.model].filter(Boolean);
  return parts.join(' | ') || '-';
}

function normalizeTaskResponse<
  T extends {
    options?: unknown;
    taskInfo?: unknown;
    taskResult?: unknown;
  },
>(task: T) {
  return {
    ...task,
    options: parseDbJsonValue(task.options),
    taskInfo: parseDbJsonValue(task.taskInfo),
    taskResult: parseDbJsonValue(task.taskResult),
  };
}

const routeHandlers = createSecureJsonPostRoute({
  actionName: 'ai-query-post',
  schema: queryPayloadSchema,
  parseErrorMessage: 'invalid params',
  unauthorizedMessage: 'no auth, please sign in',
  unauthorizedStatus: 401,
  rateLimit: {
    limiter: queryLimiter,
    keyPrefix: 'ai-query',
    message: 'too many ai query requests',
  },
  async handler({ request, user, body }) {
    try {
      const { taskId } = body as QueryPayload;
      const requestContext = resolveRequestContext(request.headers, {
        path: '/api/ai/query',
      });

      const task = await findAITaskById(taskId);
      if (!task || !task.taskId) {
        return respErrWithStatus('task not found', 404);
      }

      if (task.userId !== user.id) {
        return respErrWithStatus('no permission', 403);
      }

      if (isKieImageProvider(task.provider)) {
        const kieImageService = await getKieImageService();
        const kieTier = (await getCurrentSubscription(user.id))
          ? 'paid'
          : 'free';
        const result = await kieImageService.query({
          taskId: task.taskId,
          tier: kieTier as 'paid' | 'free',
        });

        if (!result?.taskStatus) {
          return respErrWithStatus('query ai task failed', 502);
        }

        const updateAITask: UpdateAITask = {
          status: result.taskStatus,
          taskInfo: result.taskInfo ?? null,
          taskResult: result.taskResult ?? null,
          creditId: task.creditId,
        };

        const hasChanges =
          updateAITask.status !== task.status ||
          stringifyDbJsonValue(updateAITask.taskInfo) !==
            stringifyDbJsonValue(task.taskInfo) ||
          stringifyDbJsonValue(updateAITask.taskResult) !==
            stringifyDbJsonValue(task.taskResult);

        const shouldNotifyError =
          hasChanges &&
          !isTerminalStatus(task.status) &&
          (result.taskStatus === AITaskStatus.FAILED ||
            result.taskStatus === AITaskStatus.CANCELED);

        if (hasChanges) {
          await updateAITaskById(task.id, updateAITask);

          if (result.taskStatus === AITaskStatus.SUCCESS) {
            await recordFirstSuccessfulGeneration({
              task: {
                ...task,
                ...updateAITask,
              },
              source: 'query',
              requestContext,
            });
          }

          if (shouldNotifyError) {
            const errorDetails = extractErrorDetails(
              result.taskInfo,
              result.taskResult
            );

            try {
              await sendErrorNotification({
                email: user.email || undefined,
                name: user.name || undefined,
                apiEndpoint: errorDetails.apiEndpoint,
                apiProvider: task.provider,
                errorCode: errorDetails.errorCode,
                errorMessage: errorDetails.errorMessage,
                prompt: task.prompt || undefined,
                type: buildTaskType(task),
                taskId: task.taskId || task.id,
              });
            } catch (notifyErr) {
              console.error('[ai/query] error notification failed', notifyErr);
            }
          }
        }

        const nextTask = isTerminalStatus(result.taskStatus)
          ? {
              ...task,
              ...updateAITask,
              status: updateAITask.status || task.status,
              taskInfo: updateAITask.taskInfo ?? task.taskInfo,
              taskResult: updateAITask.taskResult ?? task.taskResult,
            }
          : null;

        if (nextTask) {
          after(async () => {
            await syncAITaskUserNotifications({
              task: nextTask,
              user,
            });
          });
        }

        return respData({
          ...normalizeTaskResponse(task),
          status: updateAITask.status || task.status,
          taskInfo: parseDbJsonValue(updateAITask.taskInfo ?? task.taskInfo),
          taskResult: parseDbJsonValue(
            updateAITask.taskResult ?? task.taskResult
          ),
        });
      }

      if (!isSeedanceProviderName(task.provider)) {
        if (!isActiveAITaskStatus(task.status)) {
          return respData(normalizeTaskResponse(task));
        }

        const legacyUpdate = buildLegacyProviderRetiredUpdate(task);
        const updatedTask = await updateAITaskById(task.id, legacyUpdate);
        const nextLegacyTask = updatedTask || {
          ...task,
          ...legacyUpdate,
        };

        if (isTerminalStatus(nextLegacyTask.status)) {
          after(async () => {
            await syncAITaskUserNotifications({
              task: nextLegacyTask,
              user,
            });
          });
        }

        return respData(normalizeTaskResponse(nextLegacyTask));
      }

      const seedanceService = await getSeedanceService();
      const result = await seedanceService.query({
        provider: task.provider,
        taskId: task.taskId,
        model: task.model || undefined,
      });

      if (!result?.taskStatus) {
        return respErrWithStatus('query ai task failed', 502);
      }

      if (result.taskInfo) {
        result.taskInfo = seedanceService.attachExistingTrace({
          taskInfo: parseDbJsonValue(task.taskInfo),
          nextTaskInfo: result.taskInfo,
          provider: task.provider,
          model: task.model || '',
        }) as any;
      }

      if (
        result.taskStatus === AITaskStatus.FAILED ||
        result.taskStatus === AITaskStatus.CANCELED
      ) {
        const fallback = await seedanceService.retryWithFallback({
          task: {
            id: task.id,
            scene: task.scene,
            provider: task.provider,
            model: task.model,
            prompt: task.prompt,
            options: task.options,
            taskInfo: result.taskInfo ?? task.taskInfo,
            taskResult: result.taskResult ?? task.taskResult,
          },
          loggerLabel: 'ai/query',
        });

        if (fallback) {
          const fallbackUpdate: UpdateAITask = {
            provider: fallback.provider,
            model: fallback.model,
            taskId: fallback.taskId,
            status: fallback.status,
            taskInfo: fallback.taskInfo ?? null,
            taskResult: fallback.taskResult ?? null,
            creditId: task.creditId,
          };

          await updateAITaskById(task.id, fallbackUpdate);

          return respData({
            ...normalizeTaskResponse(task),
            provider: fallback.provider,
            model: fallback.model,
            taskId: fallback.taskId,
            status: fallback.status,
            taskInfo: parseDbJsonValue(fallbackUpdate.taskInfo),
            taskResult: parseDbJsonValue(fallbackUpdate.taskResult),
          });
        }
      }

      const updateAITask: UpdateAITask = {
        status: result.taskStatus,
        taskInfo: result.taskInfo ?? null,
        taskResult: result.taskResult ?? null,
        creditId: task.creditId,
      };

      const hasChanges =
        updateAITask.status !== task.status ||
        stringifyDbJsonValue(updateAITask.taskInfo) !==
          stringifyDbJsonValue(task.taskInfo) ||
        stringifyDbJsonValue(updateAITask.taskResult) !==
          stringifyDbJsonValue(task.taskResult);

      const shouldNotifyError =
        hasChanges &&
        !isTerminalStatus(task.status) &&
        (result.taskStatus === AITaskStatus.FAILED ||
          result.taskStatus === AITaskStatus.CANCELED);

      if (hasChanges) {
        await updateAITaskById(task.id, updateAITask);

        if (result.taskStatus === AITaskStatus.SUCCESS) {
          await recordFirstSuccessfulGeneration({
            task: {
              ...task,
              ...updateAITask,
            },
            source: 'query',
            requestContext,
          });
        }

        if (shouldNotifyError) {
          const errorDetails = extractErrorDetails(
            result.taskInfo,
            result.taskResult
          );

          try {
            await sendErrorNotification({
              email: user.email || undefined,
              name: user.name || undefined,
              apiEndpoint: errorDetails.apiEndpoint,
              apiProvider: task.provider,
              errorCode: errorDetails.errorCode,
              errorMessage: errorDetails.errorMessage,
              prompt: task.prompt || undefined,
              type: buildTaskType(task),
              taskId: task.taskId || task.id,
            });
          } catch (notifyErr) {
            console.error('[ai/query] error notification failed', notifyErr);
          }
        }
      }

      const nextTask = isTerminalStatus(result.taskStatus)
        ? {
            ...task,
            ...updateAITask,
            status: updateAITask.status || task.status,
            taskInfo: updateAITask.taskInfo ?? task.taskInfo,
            taskResult: updateAITask.taskResult ?? task.taskResult,
          }
        : null;

      if (nextTask) {
        after(async () => {
          await syncAITaskUserNotifications({
            task: nextTask,
            user,
          });
        });
      }

      return respData({
        ...normalizeTaskResponse(task),
        status: updateAITask.status || task.status,
        taskInfo: parseDbJsonValue(updateAITask.taskInfo ?? task.taskInfo),
        taskResult: parseDbJsonValue(
          updateAITask.taskResult ?? task.taskResult
        ),
      });
    } catch (error: unknown) {
      console.error('[ai/query] failed', {
        userId: user.id,
        taskId: body.taskId,
        error,
      });
      const message =
        error instanceof Error ? error.message : 'ai query failed';
      return respErrWithStatus(message, 500);
    }
  },
});

export const { OPTIONS, POST } = routeHandlers;
