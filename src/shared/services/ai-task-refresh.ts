import { z } from 'zod';

import { isKieImageProvider } from '@/extensions/ai/kie-market/types';
import { isSeedanceProviderName } from '@/extensions/ai/seedance/capability';
import { AITaskStatus } from '@/extensions/ai/types';
import { parseDbJsonValue, stringifyDbJsonValue } from '@/shared/lib/db-json';
import {
  AITask,
  findAITaskById,
  updateAITaskById,
} from '@/shared/models/ai_task';

import {
  buildLegacyProviderRetiredUpdate,
  isActiveAITaskStatus,
} from './ai-legacy';
import { syncAITaskUserNotifications } from './ai-task-user-notifications';
import { getKieImageService } from './kie-image';
import { getSeedanceService } from './seedance';

export const batchRefreshRequestSchema = z.object({
  taskIds: z.array(z.string().trim().min(1)).min(1).max(20),
});

export type TaskRefreshResult = {
  id: string;
  status: string;
  changed: boolean;
};

type RefreshAITasksOptions = {
  taskIds: string[];
  canAccessTask?: (task: AITask) => boolean | Promise<boolean>;
  deniedStatus?: string;
  concurrency?: number;
  loggerLabel: string;
};

type RefreshAITasksResponse = {
  results: TaskRefreshResult[];
  hasAnyChange: boolean;
  refreshedCount: number;
  totalCount: number;
};

export async function refreshAITasksBatch({
  taskIds,
  canAccessTask,
  deniedStatus = 'no_permission',
  concurrency = 5,
  loggerLabel,
}: RefreshAITasksOptions): Promise<RefreshAITasksResponse> {
  const dedupedTaskIds = Array.from(new Set(taskIds.filter(Boolean)));
  const results: TaskRefreshResult[] = [];
  let hasAnyChange = false;

  const refreshOne = async (taskId: string) => {
    try {
      const task = await findAITaskById(taskId);
      if (!task || !task.taskId || !task.provider) {
        results.push({ id: taskId, status: 'not_found', changed: false });
        return;
      }

      if (canAccessTask && !(await canAccessTask(task))) {
        results.push({ id: taskId, status: deniedStatus, changed: false });
        return;
      }

      if (
        ![AITaskStatus.PENDING, AITaskStatus.PROCESSING].includes(
          task.status as AITaskStatus
        )
      ) {
        results.push({
          id: taskId,
          status: task.status || 'unknown',
          changed: false,
        });
        return;
      }

      if (isKieImageProvider(task.provider)) {
        const kieImageService = await getKieImageService();
        const result = await kieImageService.query({
          taskId: task.taskId,
        });

        if (!result?.taskStatus) {
          results.push({
            id: taskId,
            status: task.status || 'unknown',
            changed: false,
          });
          return;
        }

        const hasChanges =
          result.taskStatus !== task.status ||
          stringifyDbJsonValue(result.taskInfo ?? null) !==
            stringifyDbJsonValue(task.taskInfo) ||
          stringifyDbJsonValue(result.taskResult ?? null) !==
            stringifyDbJsonValue(task.taskResult);

        if (hasChanges) {
          await updateAITaskById(task.id, {
            status: result.taskStatus,
            taskInfo: result.taskInfo ?? null,
            taskResult: result.taskResult ?? null,
            creditId: task.creditId || undefined,
          });
          hasAnyChange = true;
        }

        if (
          result.taskStatus === AITaskStatus.SUCCESS ||
          result.taskStatus === AITaskStatus.FAILED ||
          result.taskStatus === AITaskStatus.CANCELED
        ) {
          await syncAITaskUserNotifications({
            task: {
              ...task,
              status: result.taskStatus,
              taskInfo: result.taskInfo ?? task.taskInfo,
              taskResult: result.taskResult ?? task.taskResult,
            },
          });
        }

        results.push({
          id: taskId,
          status: result.taskStatus,
          changed: hasChanges,
        });
        return;
      }

      const isSeedanceTask = isSeedanceProviderName(task.provider);
      if (!isSeedanceTask) {
        if (!isActiveAITaskStatus(task.status)) {
          results.push({
            id: taskId,
            status: task.status || 'unknown',
            changed: false,
          });
          return;
        }

        const legacyUpdate = buildLegacyProviderRetiredUpdate(task);
        await updateAITaskById(task.id, legacyUpdate);
        if (
          legacyUpdate.status === AITaskStatus.SUCCESS ||
          legacyUpdate.status === AITaskStatus.FAILED ||
          legacyUpdate.status === AITaskStatus.CANCELED
        ) {
          await syncAITaskUserNotifications({
            task: {
              ...task,
              ...legacyUpdate,
            },
          });
        }
        hasAnyChange = true;
        results.push({
          id: taskId,
          status: legacyUpdate.status || AITaskStatus.FAILED,
          changed: true,
        });
        return;
      }

      const seedanceService = await getSeedanceService();
      const result = await seedanceService.query({
        provider: task.provider as any,
        taskId: task.taskId,
        model: task.model || undefined,
      });

      if (isSeedanceTask && result.taskInfo) {
        result.taskInfo = seedanceService.attachExistingTrace({
          taskInfo: parseDbJsonValue(task.taskInfo),
          nextTaskInfo: result.taskInfo,
          provider: task.provider as any,
          model: task.model || '',
        }) as any;
      }

      if (!result?.taskStatus) {
        results.push({
          id: taskId,
          status: task.status || 'unknown',
          changed: false,
        });
        return;
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
          loggerLabel,
        });

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
          hasAnyChange = true;
          results.push({
            id: taskId,
            status: fallback.status,
            changed: true,
          });
          return;
        }
      }

      const hasChanges =
        result.taskStatus !== task.status ||
        stringifyDbJsonValue(result.taskInfo ?? null) !==
          stringifyDbJsonValue(task.taskInfo) ||
        stringifyDbJsonValue(result.taskResult ?? null) !==
          stringifyDbJsonValue(task.taskResult);

      if (hasChanges) {
        await updateAITaskById(task.id, {
          status: result.taskStatus,
          taskInfo: result.taskInfo ?? null,
          taskResult: result.taskResult ?? null,
          creditId: task.creditId || undefined,
        });
        hasAnyChange = true;
      }

      if (
        result.taskStatus === AITaskStatus.SUCCESS ||
        result.taskStatus === AITaskStatus.FAILED ||
        result.taskStatus === AITaskStatus.CANCELED
      ) {
        await syncAITaskUserNotifications({
          task: {
            ...task,
            status: result.taskStatus,
            taskInfo: result.taskInfo ?? task.taskInfo,
            taskResult: result.taskResult ?? task.taskResult,
          },
        });
      }

      results.push({
        id: taskId,
        status: result.taskStatus,
        changed: hasChanges,
      });
    } catch (error) {
      console.error(`[${loggerLabel}] Error refreshing task ${taskId}:`, error);
      results.push({ id: taskId, status: 'error', changed: false });
    }
  };

  for (let i = 0; i < dedupedTaskIds.length; i += concurrency) {
    const slice = dedupedTaskIds.slice(i, i + concurrency);
    await Promise.all(slice.map((taskId) => refreshOne(taskId)));
  }

  return {
    results,
    hasAnyChange,
    refreshedCount: results.filter((result) => result.changed).length,
    totalCount: results.length,
  };
}
