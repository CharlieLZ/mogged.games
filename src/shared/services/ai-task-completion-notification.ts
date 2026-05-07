import { AITaskStatus } from '@/extensions/ai/types';
import {
  getAITaskCompletionEmailHtml,
  getAITaskCompletionEmailSubject,
  getAITaskCompletionEmailText,
} from '@/shared/blocks/email/ai-task-completion';
import {
  getAbsoluteLocalizedAITaskDetailUrl,
  getAbsoluteLocalizedAITasksUrl,
} from '@/shared/lib/ai-task-links';
import { extractAITaskMediaItems } from '@/shared/lib/ai-task-media';
import {
  claimAITaskCompletionNotificationDelivery,
  markAITaskCompletionNotificationDelivered,
  markAITaskCompletionNotificationFailed,
} from '@/shared/models/ai_task';
import { type User, findUserById } from '@/shared/models/user';

import { getEmailService } from './email';

type NotifiableAITask = {
  id: string;
  userId: string;
  status?: string | null;
  scene?: string | null;
  mediaType?: string | null;
  prompt?: string | null;
  taskInfo?: unknown;
  taskResult?: unknown;
  completionNotificationRequested?: boolean | null;
  completionNotificationLocale?: string | null;
  completionNotificationSentAt?: Date | string | null;
};

type NotifiableUser = Pick<User, 'id' | 'name' | 'email'> & {
  locale?: string | null;
};

export async function maybeSendAITaskCompletionNotification({
  task,
  user,
}: {
  task: NotifiableAITask;
  user?: NotifiableUser | null;
}) {
  if (
    task.status !== AITaskStatus.SUCCESS ||
    !task.completionNotificationRequested ||
    task.completionNotificationSentAt
  ) {
    return;
  }

  const claimed = await claimAITaskCompletionNotificationDelivery(task.id);
  if (!claimed) {
    return;
  }

  try {
    const resolvedUser =
      user && user.email ? user : await findUserById(task.userId);
    if (!resolvedUser?.email) {
      await markAITaskCompletionNotificationFailed(task.id, {
        errorMessage: 'user email is unavailable',
      });
      return;
    }

    const locale =
      task.completionNotificationLocale || resolvedUser.locale || 'en';
    const taskUrl = getAbsoluteLocalizedAITaskDetailUrl(task.id, locale);
    const activityUrl = getAbsoluteLocalizedAITasksUrl(locale);
    const primaryDownloadUrl =
      extractAITaskMediaItems(task.taskInfo).at(0)?.url ||
      extractAITaskMediaItems(task.taskResult).at(0)?.url ||
      null;
    const displayName = resolvedUser.name || resolvedUser.email;
    const emailService = await getEmailService();
    const message = {
      to: resolvedUser.email,
      subject: getAITaskCompletionEmailSubject(displayName, {
        locale,
        scene: task.scene,
        prompt: task.prompt,
        taskUrl,
        activityUrl,
        primaryDownloadUrl,
      }),
      html: getAITaskCompletionEmailHtml(displayName, {
        locale,
        scene: task.scene,
        prompt: task.prompt,
        taskUrl,
        activityUrl,
        primaryDownloadUrl,
      }),
      text: getAITaskCompletionEmailText(displayName, {
        locale,
        scene: task.scene,
        prompt: task.prompt,
        taskUrl,
        activityUrl,
        primaryDownloadUrl,
      }),
      replyTo: undefined,
      tags: ['ai-task-completion'],
      headers: {
        'X-ImageEditorAi-Email': 'ai-task-completion',
        'X-ImageEditorAi-Task-Id': task.id,
      },
    };

    const result = await emailService.sendEmail(message);
    if (!result.success) {
      throw new Error(result.error || 'ai task completion email failed');
    }

    await markAITaskCompletionNotificationDelivered(task.id, {
      deliveryProvider: result.provider,
      messageId: result.messageId || null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'ai task completion email failed';

    await markAITaskCompletionNotificationFailed(task.id, {
      errorMessage: message,
    });

    console.error('[ai-task-completion-notification] failed', {
      taskId: task.id,
      userId: task.userId,
      step: 'send_completion_email',
      error,
    });
  }
}
