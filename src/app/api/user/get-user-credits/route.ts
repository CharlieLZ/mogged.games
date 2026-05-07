import { createSecurePostRoute } from '@/shared/lib/api/secure-json-route';
import { resolveCreditCountryCodeFromHeaders } from '@/shared/lib/credit-region-policy';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { getUserCredits } from '@/shared/models/user';

const routeHandlers = createSecurePostRoute({
  actionName: 'user-get-credits-post',
  unauthorizedMessage: 'no auth, please sign in',
  unauthorizedStatus: 401,
  async handler({ request, user }) {
    try {
      const credits = await getUserCredits(
        user.id,
        resolveCreditCountryCodeFromHeaders(request.headers)
      );

      return respData(credits);
    } catch (error: unknown) {
      console.error('[user/get-user-credits] failed', {
        userId: user.id,
        error,
      });
      return respErrWithStatus('get user credits failed', 500);
    }
  },
});

export const { OPTIONS, POST } = routeHandlers;
