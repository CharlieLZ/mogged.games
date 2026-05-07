import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { respData, respErr } from '@/shared/lib/resp';
import type { AITask } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/services/current-user';
import {
  batchRefreshRequestSchema,
  refreshAITasksBatch,
} from '@/shared/services/ai-task-refresh';

type BatchRefreshUser = NonNullable<Awaited<ReturnType<typeof getUserInfo>>>;

type BatchRefreshRouteOptions = {
  actionName: string;
  loggerLabel: string;
  authorize?: (
    user: BatchRefreshUser
  ) => Promise<Response | null> | Response | null;
  canAccessTask?: (
    task: AITask,
    user: BatchRefreshUser
  ) => Promise<boolean> | boolean;
  deniedStatus?: string;
};

export function createAITaskBatchRefreshRoute(
  options: BatchRefreshRouteOptions
) {
  return createSecureJsonPostRoute({
    actionName: options.actionName,
    schema: batchRefreshRequestSchema,
    parseErrorMessage: 'invalid params: taskIds required',
    authorize: ({ user }) => {
      const accountUser = user as BatchRefreshUser;
      return options.authorize ? options.authorize(accountUser) : null;
    },
    async handler({ user, body }) {
      try {
        const accountUser = user as BatchRefreshUser;

        const result = await refreshAITasksBatch({
          taskIds: body.taskIds,
          canAccessTask: options.canAccessTask
            ? (task) => options.canAccessTask!(task, accountUser)
            : undefined,
          deniedStatus: options.deniedStatus,
          loggerLabel: options.loggerLabel,
        });

        return respData(result);
      } catch (error: unknown) {
        console.error(`[${options.loggerLabel}] Error:`, error);
        const message =
          error instanceof Error ? error.message : 'batch refresh failed';
        return respErr(message);
      }
    },
  });
}
