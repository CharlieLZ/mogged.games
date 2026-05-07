import { PERMISSIONS } from '@/core/rbac';
import { createSecurePostRoute } from '@/shared/lib/api/secure-json-route';
import { resolveCreditCountryCodeFromHeaders } from '@/shared/lib/credit-region-policy';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { findUserNotificationPreferenceByUserId } from '@/shared/models/user-notification-preference';
import { getUserCredits } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

const routeHandlers = createSecurePostRoute({
  actionName: 'user-get-info-post',
  unauthorizedMessage: 'no auth, please sign in',
  unauthorizedStatus: 401,
  async handler({ request, user }) {
    try {
      const countryCode = resolveCreditCountryCodeFromHeaders(request.headers);
      const notificationPreferencePromise =
        findUserNotificationPreferenceByUserId(user.id).catch(
          (error: unknown) => {
            console.warn(
              '[user/get-user-info] failed to load notification preference',
              {
                userId: user.id,
                error,
              }
            );

            return null;
          }
        );

      const [isAdmin, credits, notificationPreference] = await Promise.all([
        hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS),
        getUserCredits(user.id, countryCode),
        notificationPreferencePromise,
      ]);

      return respData({
        ...user,
        isAdmin,
        credits,
        notificationPreferences: {
          aiTaskCompletionEmailEnabled:
            notificationPreference?.aiTaskCompletionEmailEnabled ?? false,
        },
      });
    } catch (error: unknown) {
      console.error('[user/get-user-info] failed', {
        userId: user.id,
        error,
      });
      return respErrWithStatus('get user info failed', 500);
    }
  },
});

export const { OPTIONS, POST } = routeHandlers;
