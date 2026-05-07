import { setRequestLocale } from 'next-intl/server';

import { redirect } from '@/core/i18n/navigation';
import { PERMISSIONS, requireAdminPermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common/empty';
import { ADMIN_ROUTES } from '@/shared/lib/admin-routes';
import { findAITaskById } from '@/shared/models/ai_task';
import { refreshAITasksBatch } from '@/shared/services/ai-task-refresh';

export default async function RefreshAdminAITaskPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  await requireAdminPermission(PERMISSIONS.AITASKS_WRITE, locale);

  const task = await findAITaskById(id);
  if (!task || !task.taskId || !task.provider || !task.status) {
    return <Empty message="Task not found" />;
  }

  await refreshAITasksBatch({
    taskIds: [task.id],
    loggerLabel: 'admin-ai-task-refresh-page',
  });

  redirect({ href: ADMIN_ROUTES.AI_TASKS, locale });
}
