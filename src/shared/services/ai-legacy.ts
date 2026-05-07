import { AITaskStatus } from '@/extensions/ai/types';
import { parseDbJsonRecord } from '@/shared/lib/db-json';
import type { AITask, UpdateAITask } from '@/shared/models/ai_task';

export const LEGACY_AI_PROVIDER_RETIRED_CODE = 'LEGACY_PROVIDER_RETIRED';

export function isActiveAITaskStatus(status?: string | null) {
  return status === AITaskStatus.PENDING || status === AITaskStatus.PROCESSING;
}

export function buildLegacyProviderRetiredUpdate(
  task: Pick<AITask, 'provider' | 'model' | 'status' | 'creditId'>
): UpdateAITask {
  const errorMessage =
    'This historical task belongs to a retired provider route. Stored results remain available, but new polling, retries, and fallback are no longer supported.';

  return {
    status: AITaskStatus.FAILED,
    taskInfo: {
      status: 'failed',
      errorCode: LEGACY_AI_PROVIDER_RETIRED_CODE,
      errorMessage,
      retiredProvider: task.provider,
      retiredModel: task.model || undefined,
      retiredAt: new Date().toISOString(),
    },
    taskResult: {
      code: LEGACY_AI_PROVIDER_RETIRED_CODE,
      error: errorMessage,
      provider: task.provider,
      model: task.model || undefined,
      legacyProviderRetired: true,
    },
    creditId: task.creditId || undefined,
  };
}

export function isLegacyProviderRetiredTask(
  task: Pick<AITask, 'taskInfo' | 'taskResult'>
) {
  const taskInfo = parseDbJsonRecord(task.taskInfo);
  const taskResult = parseDbJsonRecord(task.taskResult);

  return (
    taskInfo?.errorCode === LEGACY_AI_PROVIDER_RETIRED_CODE ||
    taskResult?.code === LEGACY_AI_PROVIDER_RETIRED_CODE ||
    taskResult?.legacyProviderRetired === true
  );
}
