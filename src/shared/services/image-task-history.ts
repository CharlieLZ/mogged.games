import 'server-only';

import {
  IMAGE_TASK_HISTORY_LIMIT,
  mapAITaskToImageTaskHistoryEntry,
  type ImageTaskHistorySnapshot,
} from '@/shared/lib/image-task-history';
import { getAITasks, getAITasksCount } from '@/shared/models/ai_task';

export async function getUserImageTaskHistorySnapshot({
  userId,
  limit = IMAGE_TASK_HISTORY_LIMIT,
}: {
  userId: string;
  limit?: number;
}): Promise<ImageTaskHistorySnapshot> {
  const normalizedLimit = Math.min(
    Math.max(1, Math.trunc(limit || IMAGE_TASK_HISTORY_LIMIT)),
    IMAGE_TASK_HISTORY_LIMIT
  );

  const [tasks, total] = await Promise.all([
    getAITasks({
      userId,
      mediaType: 'image',
      limit: normalizedLimit,
    }),
    getAITasksCount({
      userId,
      mediaType: 'image',
    }),
  ]);

  return {
    items: tasks
      .map((task) => mapAITaskToImageTaskHistoryEntry(task))
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    total,
  };
}
