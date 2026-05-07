import { rateLimit } from '@/shared/lib/api/rate-limit';
import { createSecurePostRoute } from '@/shared/lib/api/secure-json-route';
import { resolveCreditCountryCodeFromHeaders } from '@/shared/lib/credit-region-policy';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { claimDailyCredits } from '@/shared/services/daily-claim';

const dailyClaimLimiter = rateLimit({
  uniqueTokenPerInterval: 10,
  interval: 60 * 1000,
});

const routeHandlers = createSecurePostRoute({
  actionName: 'user-daily-claim-post',
  unauthorizedMessage: 'no auth, please sign in',
  unauthorizedStatus: 401,
  rateLimit: {
    limiter: dailyClaimLimiter,
    keyPrefix: 'user-daily-claim',
    message: 'too many daily claim requests',
  },
  async handler({ request, user }) {
    try {
      const countryCode = resolveCreditCountryCodeFromHeaders(request.headers);

      const result = await claimDailyCredits(user, countryCode);

      if (result.alreadyClaimed) {
        return respErrWithStatus('already claimed today', 409);
      }

      return respData({
        success: true,
        credits: result.credits,
        message: 'Daily claim successful',
      });
    } catch (error: unknown) {
      console.error('[daily-claim] failed', {
        userId: user.id,
        error,
      });
      return respErrWithStatus('daily claim failed', 500);
    }
  },
});

export const { OPTIONS, POST } = routeHandlers;
