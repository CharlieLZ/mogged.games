import { resolveAppLocale } from '@/config/locale';
import { getLocalizedPath } from '@/core/i18n/localized-path';
import { getAppUrl } from '@/shared/lib/brand';

export function getAITasksPath() {
  return '/activity/ai-tasks';
}

export function getAITaskDetailPath(taskId: string) {
  return `${getAITasksPath()}/${encodeURIComponent(taskId)}`;
}

export function getAbsoluteLocalizedAITaskDetailUrl(
  taskId: string,
  locale?: string | null
) {
  const resolvedLocale = resolveAppLocale(locale) || 'en';
  return `${getAppUrl()}${getLocalizedPath(
    getAITaskDetailPath(taskId),
    resolvedLocale
  )}`;
}

export function getAbsoluteLocalizedAITasksUrl(locale?: string | null) {
  const resolvedLocale = resolveAppLocale(locale) || 'en';
  return `${getAppUrl()}${getLocalizedPath(getAITasksPath(), resolvedLocale)}`;
}
