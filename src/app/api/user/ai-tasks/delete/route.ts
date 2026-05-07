import { z } from 'zod';

import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { softDeleteAITaskById } from '@/shared/models/ai_task';

const routeHandlers = createSecureJsonPostRoute({
  actionName: 'user-ai-tasks-delete-post',
  unauthorizedMessage: 'no auth, please sign in',
  unauthorizedStatus: 401,
  schema: z.object({
    taskId: z.string().trim().min(1),
  }),
  parseErrorMessage: 'invalid delete ai task request',
  async handler({ body, user }) {
    try {
      const deletedTaskId = await softDeleteAITaskById({
        id: body.taskId,
        userId: user.id,
      });

      if (!deletedTaskId) {
        return respErrWithStatus('ai task not found', 404);
      }

      return respData({
        taskId: deletedTaskId,
      });
    } catch (error: unknown) {
      console.error('[user/ai-tasks/delete] failed', {
        userId: user.id,
        taskId: body.taskId,
        error,
      });
      return respErrWithStatus('delete ai task failed', 500);
    }
  },
});

export const { OPTIONS, POST } = routeHandlers;
