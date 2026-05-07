import { redirect } from '@/core/i18n/navigation';
import { Empty } from '@/shared/blocks/common/empty';
import { findAITaskById } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/services/current-user';
import { refreshAITasksBatch } from '@/shared/services/ai-task-refresh';

export default async function RefreshAITaskPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const [user, task] = await Promise.all([getUserInfo(), findAITaskById(id)]);
  if (
    !user ||
    !task ||
    task.userId !== user.id ||
    !task.taskId ||
    !task.provider ||
    !task.status
  ) {
    return <Empty message="Task not found" />;
  }

  await refreshAITasksBatch({
    taskIds: [task.id],
    canAccessTask: async (currentTask) => currentTask.userId === user.id,
    loggerLabel: 'activity-ai-task-refresh-page',
  });

  redirect({ href: `/activity/ai-tasks`, locale });
}
