import { z } from 'zod';

import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { IMAGE_TASK_HISTORY_LIMIT } from '@/shared/lib/image-task-history';
import { getUserImageTaskHistorySnapshot } from '@/shared/services/image-task-history';

const routeHandlers = createSecureJsonPostRoute({
  actionName: 'user-ai-tasks-recent-post',
  unauthorizedMessage: 'no auth, please sign in',
  unauthorizedStatus: 401,
  schema: z.object({
    limit: z.number().int().min(1).max(IMAGE_TASK_HISTORY_LIMIT).optional(),
  }),
  parseErrorMessage: 'invalid recent tasks request',
  async handler({ body, user }) {
    try {
      const snapshot = await getUserImageTaskHistorySnapshot({
        userId: user.id,
        limit: body.limit,
      });

      return respData(snapshot);
    } catch (error: unknown) {
      console.error('[user/ai-tasks/recent] failed', {
        userId: user.id,
        limit: body.limit,
        error,
      });
      return respErrWithStatus('load recent ai tasks failed', 500);
    }
  },
});

export const { OPTIONS, POST } = routeHandlers;
