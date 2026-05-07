import { getAITaskDetailPath } from '@/shared/lib/ai-task-links';
import { parseDbJsonRecord } from '@/shared/lib/db-json';
import { type UserNotification } from '@/shared/models/user-notification';

type Translate = (
  key: string,
  values?: Record<string, string | number | Date>
) => string;

export type UserNotificationView = {
  title: string;
  description: string;
  badge: string;
  tone: 'success' | 'error' | 'info';
  actionPath: string;
};

function getString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function getPromptPreview(prompt: string | null, t: Translate) {
  if (!prompt) {
    return t('prompt_empty');
  }

  return prompt.length > 140 ? `${prompt.slice(0, 137)}...` : prompt;
}

function getSceneLabel(scene: string | null, t: Translate) {
  if (!scene) {
    return t('scene_unknown');
  }

  const normalizedKey = scene.replace(/-/g, '_');
  const translated = t(`scenes.${normalizedKey}`);

  if (
    !translated ||
    translated === `activity.notifications.scenes.${normalizedKey}` ||
    translated === `scenes.${normalizedKey}`
  ) {
    return scene;
  }

  return translated;
}

export function getUserNotificationView(
  notification: UserNotification,
  t: Translate
): UserNotificationView {
  const payload = parseDbJsonRecord(notification.payload) || {};
  const prompt = getPromptPreview(getString(payload.prompt), t);
  const scene = getSceneLabel(getString(payload.scene), t);
  const actionPath =
    getString(payload.actionPath) || getAITaskDetailPath(notification.sourceId);

  if (notification.type === 'ai_task_completed') {
    return {
      title: t('items.ai_task_completed.title'),
      description: t('items.ai_task_completed.description', {
        scene,
        prompt,
      }),
      badge: t('badges.completed'),
      tone: 'success',
      actionPath,
    };
  }

  if (notification.type === 'ai_task_failed') {
    const errorMessage = getString(payload.errorMessage);
    const finalStatus = getString(payload.finalStatus);
    const isCanceled = finalStatus === 'canceled';

    return {
      title: isCanceled
        ? t('items.ai_task_canceled.title')
        : t('items.ai_task_failed.title'),
      description: errorMessage
        ? t('items.ai_task_failed.description_with_error', {
            scene,
            prompt,
            error: errorMessage,
          })
        : t('items.ai_task_failed.description', {
            scene,
            prompt,
          }),
      badge: isCanceled ? t('badges.canceled') : t('badges.failed'),
      tone: 'error',
      actionPath,
    };
  }

  return {
    title: t('items.fallback.title'),
    description: t('items.fallback.description'),
    badge: t('badges.info'),
    tone: 'info',
    actionPath,
  };
}
