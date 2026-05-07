'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AITaskStatus } from '@/extensions/ai/types';
import { JsonPreview } from '@/shared/blocks/table/json-preview';
import { parseDbJsonRecord, stringifyDbJsonValue } from '@/shared/lib/db-json';

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

function getImageUrlFromOptions(raw?: unknown) {
  const parsed = parseDbJsonRecord(raw);
  if (!parsed) return undefined;

  const candidates = [
    'image_url',
    'imageUrl',
    'image',
    'image_urls',
    'imageUrls',
    'reference_image_urls',
    'referenceImageUrls',
  ];

  for (const key of candidates) {
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

function isSuspiciousImageHost(url?: string) {
  if (!url) return false;
  try {
    const host = stripWww(new URL(url).hostname.toLowerCase());
    return CLOUD_DRIVE_HOSTS.has(host) || SOCIAL_VIDEO_HOSTS.has(host);
  } catch {
    return false;
  }
}

function toSearchableLowerText(value: unknown) {
  const text = stringifyDbJsonValue(value);
  return text ? text.toLowerCase() : '';
}

function isNsfwError(taskResult: unknown, include422 = true): boolean {
  const lower = toSearchableLowerText(taskResult);
  if (!lower) return false;
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
    lower.includes('"status":422') ||
    lower.includes('status":422') ||
    /\b422\b/.test(lower)
  );
}

function isImageAccessError(taskResult: unknown, imageUrl?: string): boolean {
  if (!imageUrl) return false;
  const lower = toSearchableLowerText(taskResult);
  if (!lower) return false;
  const hostSuspicious = isSuspiciousImageHost(imageUrl);
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

export function TaskResultCell({
  taskResult,
  status,
  options,
  scene,
}: {
  taskResult: unknown;
  status: string;
  options?: unknown;
  scene?: string | null;
}) {
  const t = useTranslations('admin.aitasks.list');
  const imageUrl = getImageUrlFromOptions(options);
  const isImageUrlScene =
    scene === 'image-to-video' || scene === 'reference-to-video';
  const shouldShowAccessError =
    status === AITaskStatus.FAILED &&
    isImageUrlScene &&
    isImageAccessError(taskResult, imageUrl);
  const shouldShowNsfw =
    status === AITaskStatus.FAILED &&
    isNsfwError(taskResult, !(isImageUrlScene && imageUrl));

  if (shouldShowAccessError) {
    return (
      <div className="text-destructive flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm">{t('error_image_url_access')}</span>
      </div>
    );
  }

  // Only show NSFW error for failed tasks
  if (shouldShowNsfw) {
    return (
      <div className="text-destructive flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm">{t('error_nsfw')}</span>
      </div>
    );
  }

  // For other cases, show the JSON preview
  if (!taskResult) {
    return <span className="text-muted-foreground">-</span>;
  }

  return <JsonPreview value={taskResult} />;
}
