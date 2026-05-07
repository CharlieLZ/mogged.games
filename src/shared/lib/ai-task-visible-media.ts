import { AITaskStatus } from '@/extensions/ai/types';

import { extractAITaskMediaItems, type AITaskMediaItem } from './ai-task-media';

type CollectAITaskVisibleMediaItemsInput = {
  status?: string | null;
  taskInfo?: unknown;
  taskResult?: unknown;
};

function isSuccessfulStatus(status?: string | null) {
  return (
    status === AITaskStatus.SUCCESS ||
    status === 'succeeded' ||
    status === 'completed' ||
    status === 'complete'
  );
}

function isProviderInternalUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('queue.fal.run');
  } catch {
    return false;
  }
}

function filterVisibleMediaItems(items: AITaskMediaItem[]) {
  const seen = new Set<string>();
  const visibleItems: AITaskMediaItem[] = [];

  for (const item of items) {
    const url = item.url.trim();
    if (!url || seen.has(url) || isProviderInternalUrl(url)) {
      continue;
    }

    seen.add(url);
    visibleItems.push({
      ...item,
      url,
    });
  }

  return visibleItems;
}

export function collectAITaskVisibleMediaItems({
  status,
  taskInfo,
  taskResult,
}: CollectAITaskVisibleMediaItemsInput): AITaskMediaItem[] {
  const taskInfoMedia = filterVisibleMediaItems(
    extractAITaskMediaItems(taskInfo)
  );
  if (taskInfoMedia.length > 0) {
    return taskInfoMedia;
  }

  if (!isSuccessfulStatus(status)) {
    return [];
  }

  return filterVisibleMediaItems(extractAITaskMediaItems(taskResult));
}
