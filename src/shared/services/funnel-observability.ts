import { AITaskStatus } from '@/extensions/ai/types';
import { FIRST_SUCCESSFUL_GENERATION_EVENT } from '@/shared/lib/funnel';
import type { RequestContextSnapshot } from '@/shared/lib/request-context';
import {
  hasUserContextEventByType,
  safeRecordUserContextEvent,
} from '@/shared/models/user_context_event';

type FirstSuccessfulGenerationTask = {
  id: string;
  userId: string;
  status?: string | null;
  provider?: string | null;
  model?: string | null;
  scene?: string | null;
  mediaType?: string | null;
};

type RecordFirstSuccessfulGenerationInput = {
  task: FirstSuccessfulGenerationTask;
  source: 'generate' | 'query' | 'notify';
  requestContext?: Partial<RequestContextSnapshot>;
  occurredAt?: Date;
};

export { FIRST_SUCCESSFUL_GENERATION_EVENT };

export async function recordFirstSuccessfulGeneration(
  input: RecordFirstSuccessfulGenerationInput
) {
  if (input.task.status !== AITaskStatus.SUCCESS) {
    return 'skipped' as const;
  }

  const alreadyRecorded = await hasUserContextEventByType(
    input.task.userId,
    FIRST_SUCCESSFUL_GENERATION_EVENT
  );

  if (alreadyRecorded) {
    return 'already-recorded' as const;
  }

  await safeRecordUserContextEvent({
    userId: input.task.userId,
    eventType: FIRST_SUCCESSFUL_GENERATION_EVENT,
    ipAddress: input.requestContext?.ipAddress,
    userAgent: input.requestContext?.userAgent,
    deviceType: input.requestContext?.deviceType,
    locale: input.requestContext?.locale,
    countryCode: input.requestContext?.countryCode,
    regionCode: input.requestContext?.regionCode,
    path: input.requestContext?.path,
    referer: input.requestContext?.referer,
    occurredAt: input.occurredAt,
    metadata: {
      taskId: input.task.id,
      provider: input.task.provider || null,
      model: input.task.model || null,
      scene: input.task.scene || null,
      mediaType: input.task.mediaType || null,
      source: input.source,
    },
  });

  return 'recorded' as const;
}
