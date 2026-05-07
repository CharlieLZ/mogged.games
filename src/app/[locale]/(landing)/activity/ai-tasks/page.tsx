import { createTranslator } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { loadMessages } from '@/core/i18n/request';
import { defaultLocale } from '@/config/locale';
import { AITaskStatus } from '@/extensions/ai/types';
import { Empty } from '@/shared/blocks/common/empty';
import { TableCard } from '@/shared/blocks/table';
import { getAITaskDetailPath } from '@/shared/lib/ai-task-links';
import { collectAITaskVisibleMediaItems } from '@/shared/lib/ai-task-visible-media';
import { parseDbJsonValue } from '@/shared/lib/db-json';
import { stripProviderBranding } from '@/shared/lib/provider-error-copy';
import { AITask, getAITasks, getAITasksCount } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/services/current-user';
import type { Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

import { AutoRefresh } from './_components/auto-refresh';
import { PreviewModal } from './_components/preview-modal';

const imageOptionKeys = [
  'image_url',
  'imageUrl',
  'image',
  'image_urls',
  'imageUrls',
  'reference_image_urls',
  'referenceImageUrls',
];

const CLOUD_DRIVE_HOSTS = new Set([
  'drive.google.com',
  'docs.google.com',
  'dropbox.com',
  'onedrive.live.com',
  '1drv.ms',
  'icloud.com',
  'photos.google.com',
]);

const SOCIAL_VIDEO_HOSTS = new Set([
  'facebook.com',
  'fb.watch',
  'instagram.com',
  'tiktok.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'youtu.be',
  'vimeo.com',
]);

const stripWww = (hostname: string) => hostname.replace(/^www\./, '');

function isSuspiciousImageHost(url?: string) {
  if (!url) return false;
  try {
    const host = stripWww(new URL(url).hostname.toLowerCase());
    return CLOUD_DRIVE_HOSTS.has(host) || SOCIAL_VIDEO_HOSTS.has(host);
  } catch {
    return false;
  }
}

function getImageUrlFromOptions(raw?: unknown) {
  const parsed = parseDbJsonValue<Record<string, unknown>>(raw);
  if (!parsed || typeof parsed !== 'object') {
    return undefined;
  }

  for (const key of imageOptionKeys) {
    const value = parsed[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (Array.isArray(value)) {
      const first = value.find(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0
      );
      if (first) {
        return first.trim();
      }
    }
  }

  return undefined;
}

function isNsfwError(errorStr?: string, include422 = true) {
  if (!errorStr) return false;
  const lower = errorStr.toLowerCase();
  if (
    lower.includes('nsfw') ||
    lower.includes('safety') ||
    lower.includes('inappropriate') ||
    lower.includes('content checker') ||
    lower.includes('sensitive content') ||
    lower.includes('sensitive information') ||
    lower.includes('outputvideosensitivecontentdetected')
  ) {
    return true;
  }
  if (!include422) return false;
  return (
    lower.includes('content could not be processed') ||
    lower.includes('unprocessable entity') ||
    lower.includes('status: 422') ||
    lower.includes('status code: 422') ||
    /\b422\b/.test(lower)
  );
}

function isImageAccessError(errorStr?: string, imageUrl?: string) {
  if (!imageUrl) return false;
  const lower = (errorStr || '').toLowerCase();
  const hostSuspicious = isSuspiciousImageHost(imageUrl);
  if (!lower.trim() && !hostSuspicious) return false;
  const hasAccessFlag =
    lower.includes('forbidden') ||
    lower.includes('unauthorized') ||
    lower.includes('permission') ||
    lower.includes('access denied') ||
    lower.includes('not authorized') ||
    lower.includes('not found') ||
    /\b(401|403|404)\b/.test(lower);
  const hasUnprocessable =
    lower.includes('content could not be processed') ||
    lower.includes('unprocessable entity') ||
    lower.includes('status: 422') ||
    lower.includes('status code: 422') ||
    /\b422\b/.test(lower);
  const hasLoadFailure =
    lower.includes('failed to load the image') ||
    lower.includes('failed to load image') ||
    lower.includes('failed to load the input') ||
    lower.includes('image could not be loaded') ||
    lower.includes('could not load image') ||
    lower.includes('failed to fetch') ||
    lower.includes('could not fetch') ||
    lower.includes('failed to download') ||
    lower.includes('unable to download');
  const hasImageSignal =
    lower.includes('image_url') ||
    lower.includes('image url') ||
    lower.includes('image') ||
    lower.includes('download') ||
    lower.includes('fetch') ||
    lower.includes('drive') ||
    lower.includes('dropbox') ||
    lower.includes('onedrive') ||
    lower.includes('url');
  return (
    hostSuspicious ||
    hasLoadFailure ||
    hasAccessFlag ||
    (hasUnprocessable && (hasImageSignal || hostSuspicious))
  );
}

export default async function AiTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; pageSize?: number; type?: string }>;
}) {
  const { page: pageNum, pageSize, type } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const rawT = await getTranslations('activity.aitasks');
  const fallbackMessages = await loadMessages(
    'activity/aitasks',
    defaultLocale
  );
  const fallbackT = createTranslator({
    locale: defaultLocale,
    namespace: 'activity.aitasks',
    messages: { activity: { aitasks: fallbackMessages } },
  }) as typeof rawT;

  const t = ((
    key: Parameters<typeof rawT>[0],
    values?: Parameters<typeof rawT>[1]
  ) => {
    const translated = rawT(key, values);
    if (
      !translated ||
      translated === key ||
      translated === `activity.aitasks.${key}`
    ) {
      return fallbackT(key, values);
    }
    return translated;
  }) as typeof rawT;

  const aiTasks = await getAITasks({
    userId: user.id,
    mediaType: type,
    page,
    limit,
  });

  const total = await getAITasksCount({
    userId: user.id,
    mediaType: type,
  });

  // Collect pending task IDs for auto-refresh
  const pendingTaskIds = aiTasks
    .filter(
      (task) =>
        task.status === AITaskStatus.PENDING ||
        task.status === AITaskStatus.PROCESSING
    )
    .map((task) => task.id);

  const table: Table = {
    title: t('list.title'),
    columns: [
      // Column order: Created At, Result, Status, Cost Credits, Action(Preview), Prompt
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      {
        name: 'result',
        title: t('fields.result'),
        callback: (item: AITask) => {
          const taskInfo = item.taskInfo;
          const taskResult = item.taskResult;

          // Helper function to detect NSFW/422 errors
          // Get error message from taskInfo or taskResult
          const errorMessage = stripProviderBranding(
            (taskInfo as { errorMessage?: string } | undefined)?.errorMessage ||
              (taskResult as { error?: string } | undefined)?.error ||
              (taskResult as { failure_reason?: string } | undefined)
                ?.failure_reason
          );
          const imageUrl = getImageUrlFromOptions(item.options);
          const isImageUrlScene =
            item.scene === 'image-to-video' ||
            item.scene === 'reference-to-video';
          const shouldShowImageAccessError =
            isImageUrlScene && isImageAccessError(errorMessage, imageUrl);
          const shouldShowNsfwError = isNsfwError(
            errorMessage,
            !(isImageUrlScene && imageUrl)
          );

          if (
            item.status === AITaskStatus.PENDING ||
            item.status === AITaskStatus.PROCESSING
          ) {
            return (
              <div className="text-muted-foreground text-sm">
                {t('list.processing', {
                  status:
                    (taskInfo as { status?: string } | undefined)?.status ||
                    item.status,
                })}
              </div>
            );
          }

          if (!taskInfo && !taskResult) {
            return '-';
          }

          if (item.status === AITaskStatus.CANCELED) {
            return (
              <div className="text-muted-foreground text-sm">
                {t('list.canceled')}
              </div>
            );
          }

          if (item.status === AITaskStatus.FAILED) {
            if (shouldShowImageAccessError) {
              return (
                <div className="text-sm text-red-500">
                  {t('list.failed_image_url_access')}
                </div>
              );
            }
            // Check if it's an NSFW error
            if (shouldShowNsfwError) {
              return (
                <div className="text-sm text-red-500">
                  {t('list.failed_nsfw')}
                </div>
              );
            }
            // Show error message if available
            if (errorMessage) {
              return (
                <div className="text-sm text-red-500">
                  {t('list.failed_with_reason', { reason: errorMessage })}
                </div>
              );
            }
            return (
              <div className="text-sm text-red-500">{t('list.failed')}</div>
            );
          }

          if (errorMessage) {
            if (shouldShowImageAccessError) {
              return (
                <div className="text-sm text-red-500">
                  {t('list.failed_image_url_access')}
                </div>
              );
            }
            if (shouldShowNsfwError) {
              return (
                <div className="text-sm text-red-500">
                  {t('list.failed_nsfw')}
                </div>
              );
            }
            return (
              <div className="text-sm text-red-500">
                {t('list.failed_with_reason', { reason: errorMessage })}
              </div>
            );
          }

          const mediaItems = collectAITaskVisibleMediaItems({
            status: item.status,
            taskInfo,
            taskResult,
          });

          if (mediaItems.length > 0) {
            return (
              <div className="text-muted-foreground text-sm">
                {t('list.result_ready', { count: mediaItems.length })}
              </div>
            );
          }

          return (
            <div className="text-muted-foreground text-sm">
              {t('list.no_result')}
            </div>
          );
        },
      },
      { name: 'status', title: t('fields.status'), type: 'label' },
      { name: 'costCredits', title: t('fields.cost_credits'), type: 'label' },
      {
        name: 'action',
        title: t('fields.action'),
        callback: (item: AITask) => (
          <Link
            href={getAITaskDetailPath(item.id)}
            className="text-primary text-sm underline hover:no-underline"
          >
            {t('list.buttons.view')}
          </Link>
        ),
      },
      {
        name: 'preview',
        title: t('fields.preview'),
        callback: (item: AITask) => {
          if (
            item.status === AITaskStatus.PENDING ||
            item.status === AITaskStatus.PROCESSING ||
            item.status === AITaskStatus.CANCELED ||
            item.status === AITaskStatus.FAILED
          ) {
            return null;
          }

          const mediaItems = collectAITaskVisibleMediaItems({
            status: item.status,
            taskInfo: item.taskInfo,
            taskResult: item.taskResult,
          });

          if (mediaItems.length === 0) {
            return null;
          }

          return (
            <PreviewModal
              items={mediaItems}
              previewLabel={t('list.buttons.preview')}
              downloadLabel={t('list.buttons.download')}
            />
          );
        },
      },
      { name: 'prompt', title: t('fields.prompt'), type: 'copy' },
    ],
    data: aiTasks,
    emptyMessage: t('list.empty_message'),
    pagination: {
      total,
      page,
      limit,
    },
  };

  const tabs: Tab[] = [
    {
      name: 'all',
      title: t('list.tabs.all'),
      url: '/activity/ai-tasks',
      is_active: !type || type === 'all',
    },
    {
      name: 'image',
      title: t('list.tabs.image'),
      url: '/activity/ai-tasks?type=image',
      is_active: type === 'image',
    },
    {
      name: 'video',
      title: t('list.tabs.video'),
      url: '/activity/ai-tasks?type=video',
      is_active: type === 'video',
    },
    {
      name: 'audio',
      title: t('list.tabs.audio'),
      url: '/activity/ai-tasks?type=audio',
      is_active: type === 'audio',
    },
    {
      name: 'text',
      title: t('list.tabs.text'),
      url: '/activity/ai-tasks?type=text',
      is_active: type === 'text',
    },
  ];

  return (
    <div className="space-y-8">
      <AutoRefresh pendingTaskIds={pendingTaskIds} />
      <TableCard title={t('list.title')} tabs={tabs} table={table} />
    </div>
  );
}
