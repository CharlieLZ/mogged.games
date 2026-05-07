import { AITaskStatus } from '@/extensions/ai/types';
import { getAITaskDetailPath } from '@/shared/lib/ai-task-links';
import { parseDbJsonRecord } from '@/shared/lib/db-json';
import { upsertUserNotification } from '@/shared/models/user-notification';
import { type User } from '@/shared/models/user';

import { maybeSendAITaskCompletionNotification } from './ai-task-completion-notification';

type NotifiableAITask = {
  id: string;
  userId: string;
  status?: string | null;
  scene?: string | null;
  mediaType?: string | null;
  provider?: string | null;
  model?: string | null;
  prompt?: string | null;
  taskInfo?: unknown;
  taskResult?: unknown;
};

type NotifiableUser = Pick<User, 'id' | 'name' | 'email'> & {
  locale?: string | null;
};

function getString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function extractAITaskFailureMessage(task: NotifiableAITask) {
  const taskInfo = parseDbJsonRecord(task.taskInfo) || {};
  const taskResult = parseDbJsonRecord(task.taskResult) || {};

  return (
    getString(taskInfo.errorMessage) ||
    getString(taskInfo.error_message) ||
    getString(taskResult.errorMessage) ||
    getString(taskResult.error_message) ||
    getString(taskResult.error) ||
    getString(taskResult.message)
  );
}

export async function syncAITaskUserNotifications({
  task,
  user,
}: {
  task: NotifiableAITask;
  user?: NotifiableUser | null;
}) {
  if (!task.id || !task.userId) {
    return;
  }

  if (task.status === AITaskStatus.SUCCESS) {
    await upsertUserNotification({
      userId: task.userId,
      type: 'ai_task_completed',
      sourceType: 'ai_task',
      sourceId: task.id,
      dedupeKey: `ai-task:${task.id}:success`,
      payload: {
        taskId: task.id,
        scene: task.scene || null,
        mediaType: task.mediaType || null,
        provider: task.provider || null,
        model: task.model || null,
        prompt: task.prompt || null,
        actionPath: getAITaskDetailPath(task.id),
      },
    });

    await maybeSendAITaskCompletionNotification({
      task,
      user,
    });
    return;
  }

  if (
    task.status === AITaskStatus.FAILED ||
    task.status === AITaskStatus.CANCELED
  ) {
    await upsertUserNotification({
      userId: task.userId,
      type: 'ai_task_failed',
      sourceType: 'ai_task',
      sourceId: task.id,
      dedupeKey: `ai-task:${task.id}:${task.status}`,
      payload: {
        taskId: task.id,
        scene: task.scene || null,
        mediaType: task.mediaType || null,
        provider: task.provider || null,
        model: task.model || null,
        prompt: task.prompt || null,
        finalStatus: task.status,
        errorMessage: extractAITaskFailureMessage(task),
        actionPath: getAITaskDetailPath(task.id),
      },
    });
  }
}
