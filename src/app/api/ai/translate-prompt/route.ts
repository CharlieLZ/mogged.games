import { z } from 'zod';

import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { rateLimit } from '@/shared/lib/api/rate-limit';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import {
  PromptTranslationError,
  translatePromptToEnglish,
} from '@/shared/services/prompt-translation';

export const maxDuration = 60;

const translatePromptLimiter = rateLimit({
  uniqueTokenPerInterval: 10,
  interval: 60 * 1000,
});

const translatePromptPayloadSchema = z.object({
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

type TranslatePromptPayload = z.infer<typeof translatePromptPayloadSchema>;

const translatePromptRouteHandlers = createSecureJsonPostRoute({
  actionName: 'ai-translate-prompt-post',
  schema: translatePromptPayloadSchema,
  parseErrorMessage: 'invalid translate prompt payload',
  unauthorizedMessage: 'sign in to translate prompts',
  rateLimit: {
    limiter: translatePromptLimiter,
    keyPrefix: 'ai-translate-prompt',
    message: 'too many translate attempts, please slow down',
  },
  async handler({ user, body }) {
    const payload = body as TranslatePromptPayload;

    try {
      const result = await translatePromptToEnglish({
        prompt: payload.prompt,
        mode: payload.mode,
        locale: payload.locale,
        userId: user.id,
      });

      return respData(result);
    } catch (error) {
      console.error('[api/ai/translate-prompt] failed', {
        step: 'translate_prompt_handler',
        userId: user.id,
        mode: payload.mode,
        locale: payload.locale,
        promptLength: payload.prompt.trim().length,
        message: error instanceof Error ? error.message : 'unknown error',
      });

      if (error instanceof PromptTranslationError) {
        return respErrWithStatus(error.message, error.status);
      }

      if (
        error instanceof Error &&
        error.message.toLowerCase().includes('openrouter_api_key is missing')
      ) {
        return respErrWithStatus(error.message, 503);
      }

      return respErrWithStatus('prompt translation failed', 502);
    }
  },
});

export const OPTIONS = translatePromptRouteHandlers.OPTIONS;
export const POST = translatePromptRouteHandlers.POST;
