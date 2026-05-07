import { createAITaskBatchRefreshRoute } from '@/shared/lib/api/ai-task-batch-refresh-route';
import { respErr } from '@/shared/lib/resp';
import { hasPermission } from '@/shared/services/rbac';

const routeHandlers = createAITaskBatchRefreshRoute({
  actionName: 'admin-ai-tasks-batch-refresh-post',
  loggerLabel: 'Batch Refresh',
  authorize: async (user) => {
    const hasAdminPermission = await hasPermission(user.id, 'admin.aitasks.*');
    return hasAdminPermission ? null : respErr('no permission');
  },
});

export const { OPTIONS, POST } = routeHandlers;
