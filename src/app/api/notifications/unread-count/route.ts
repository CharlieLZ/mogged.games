import { createSecurePostRoute } from '@/shared/lib/api/secure-json-route';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { countUnreadUserNotifications } from '@/shared/models/user-notification';

const routeHandlers = createSecurePostRoute({
  actionName: 'notifications-unread-count-post',
  unauthorizedMessage: 'no auth, please sign in',
  unauthorizedStatus: 401,
  async handler({ user }) {
    try {
      const unreadCount = await countUnreadUserNotifications(user.id);

      return respData({
        unreadCount,
      });
    } catch (error) {
      console.error('[notifications/unread-count] failed', {
        userId: user.id,
        error,
      });
      return respErrWithStatus('get notifications unread count failed', 500);
    }
  },
});

export const { OPTIONS, POST } = routeHandlers;
