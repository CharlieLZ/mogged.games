import { z } from 'zod';

import { rateLimit } from '@/shared/lib/api/rate-limit';
import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import {
  sendSupportContactMessage,
  SupportContactConfigurationError,
} from '@/shared/services/support-contact';

const supportContactLimiter = rateLimit({
  uniqueTokenPerInterval: 3,
  interval: 60 * 1000,
});

const supportContactPayloadSchema = z.object({
  requestId: z
    .string()
    .trim()
    .min(8)
    .max(120)
    .regex(/^[A-Za-z0-9_-]+$/),
  message: z.string().trim().min(10).max(2000),
});

type SupportContactPayload = z.infer<typeof supportContactPayloadSchema>;

const routeHandlers = createSecureJsonPostRoute({
  actionName: 'support-contact-post',
  schema: supportContactPayloadSchema,
  parseErrorMessage: 'invalid contact request',
  unauthorizedMessage: 'sign in to contact support',
  rateLimit: {
    limiter: supportContactLimiter,
    keyPrefix: 'support-contact',
    message: 'too many contact requests, please slow down',
  },
  async handler({ user, body }) {
    const payload = body as SupportContactPayload;

    try {
      const result = await sendSupportContactMessage({
        user,
        message: payload.message,
        requestId: payload.requestId,
      });

      return respData(result);
    } catch (error) {
      console.error('[api/support/contact] failed', {
        step: 'support_contact_handler',
        userId: user.id,
        requestId: payload.requestId,
        messageLength: payload.message.length,
        message: error instanceof Error ? error.message : 'unknown error',
      });

      if (error instanceof SupportContactConfigurationError) {
        return respErrWithStatus('support contact is not configured', 503);
      }

      return respErrWithStatus('support contact failed', 502);
    }
  },
});

export const OPTIONS = routeHandlers.OPTIONS;
export const POST = routeHandlers.POST;
