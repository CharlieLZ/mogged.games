import { z } from 'zod';

import { rateLimit } from '@/shared/lib/api/rate-limit';
import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import {
  PromptRewriteError,
  rewritePromptForSafety,
} from '@/shared/services/prompt-rewrite';

export const maxDuration = 60;

const rewritePromptLimiter = rateLimit({
  uniqueTokenPerInterval: 10,
  interval: 60 * 1000,
});

const rewritePromptPayloadSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  mode: z.enum([
    'text-to-video',
    'image-to-video',
    'reference-to-video',
    'text-to-image',
    'image-to-image',
  ]),
  locale: z.string().trim().max(12).optional().default('en'),
});

type RewritePromptPayload = z.infer<typeof rewritePromptPayloadSchema>;

const rewritePromptRouteHandlers = createSecureJsonPostRoute({
  actionName: 'ai-rewrite-prompt-post',
  schema: rewritePromptPayloadSchema,
  parseErrorMessage: 'invalid rewrite prompt payload',
  unauthorizedMessage: 'sign in to rewrite prompts',
  rateLimit: {
    limiter: rewritePromptLimiter,
    keyPrefix: 'ai-rewrite-prompt',
    message: 'too many rewrite attempts, please slow down',
  },
  async handler({ user, body }) {
    const payload = body as RewritePromptPayload;

    try {
      const result = await rewritePromptForSafety({
        prompt: payload.prompt,
        mode: payload.mode,
        locale: payload.locale,
        userId: user.id,
      });

      return respData(result);
    } catch (error) {
      console.error('[api/ai/rewrite-prompt] failed', {
        step: 'rewrite_prompt_handler',
        userId: user.id,
        mode: payload.mode,
        locale: payload.locale,
        promptLength: payload.prompt.trim().length,
        message: error instanceof Error ? error.message : 'unknown error',
      });

      if (error instanceof PromptRewriteError) {
        return respErrWithStatus(error.message, error.status);
      }

      if (
        error instanceof Error &&
        error.message.toLowerCase().includes('openrouter_api_key is missing')
      ) {
        return respErrWithStatus(error.message, 503);
      }

      return respErrWithStatus('prompt rewrite failed', 502);
    }
  },
});

export const OPTIONS = rewritePromptRouteHandlers.OPTIONS;
export const POST = rewritePromptRouteHandlers.POST;
