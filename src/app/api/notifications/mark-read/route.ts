import { z } from 'zod';

import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { markUserNotificationsRead } from '@/shared/models/user-notification';

const markReadPayloadSchema = z.object({
  notificationIds: z.array(z.string().trim().min(1)).min(1).max(100),
});

const routeHandlers = createSecureJsonPostRoute({
  actionName: 'notifications-mark-read-post',
  schema: markReadPayloadSchema,
  parseErrorMessage: 'invalid notifications mark-read payload',
  unauthorizedMessage: 'no auth, please sign in',
  unauthorizedStatus: 401,
  async handler({ user, body }) {
    try {
      const updatedCount = await markUserNotificationsRead({
        userId: user.id,
        notificationIds: body.notificationIds,
      });

      return respData({
        updatedCount,
      });
    } catch (error) {
      console.error('[notifications/mark-read] failed', {
        userId: user.id,
        notificationIds: body.notificationIds,
        error,
      });
      return respErrWithStatus('mark notifications as read failed', 500);
    }
  },
});

export const { OPTIONS, POST } = routeHandlers;
