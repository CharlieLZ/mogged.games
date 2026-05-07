import { createAITaskBatchRefreshRoute } from '@/shared/lib/api/ai-task-batch-refresh-route';

const routeHandlers = createAITaskBatchRefreshRoute({
  actionName: 'user-ai-tasks-batch-refresh-post',
  loggerLabel: 'User Batch Refresh',
  canAccessTask: (task, user) => task.userId === user.id,
});

export const { OPTIONS, POST } = routeHandlers;
