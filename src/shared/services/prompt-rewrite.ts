import 'server-only';

import { type PromptToolMode } from '@/shared/lib/prompt-tools';
import { getAllConfigs } from '@/shared/models/config';
import {
  executePromptToolWithCredits,
  type PromptToolBilledResult,
  PromptToolCreditsError,
} from '@/shared/services/prompt-tool-credits';

const OPENROUTER_REWRITE_ENDPOINT =
  'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_REWRITE_PRIMARY_MODEL = 'openai/gpt-5-mini';
const OPENROUTER_REWRITE_FALLBACK_MODELS = ['google/gemini-2.5-flash'];
const OPENROUTER_REWRITE_MAX_RETRIES = 2;
const OPENROUTER_REWRITE_TIMEOUT_MS = 15_000;
const OPENROUTER_RETRYABLE_STATUS_CODES = new Set([
  408, 409, 425, 429, 500, 502, 503, 504,
]);

type RewritePromptInput = {
  prompt: string;
  mode: PromptToolMode;
  locale: string;
  userId: string;
};

export type PromptRewriteResult = {
  rewrittenPrompt: string;
  model: string;
  requestId: string | null;
} & PromptToolBilledResult;

export class PromptRewriteError extends Error {
  code: string;
  status: number;

  constructor(
    code: string,
    message: string,
    options?: {
      status?: number;
    }
  ) {
    super(message);
    this.name = 'PromptRewriteError';
    this.code = code;
    this.status = options?.status ?? 500;
  }
}

function buildModeLabel(mode: PromptToolMode) {
  switch (mode) {
    case 'text-to-image':
      return 'Text-to-image';
    case 'image-to-image':
      return 'Image-to-image';
    case 'image-to-video':
      return 'Image-to-video';
    case 'reference-to-video':
      return 'Reference-to-video';
    case 'text-to-video':
    default:
      return 'Text-to-video';
  }
}

function sanitizeRewrittenPrompt(raw: string) {
  let normalized = raw.trim();

  normalized = normalized.replace(/^prompt\s*[:：-]\s*/i, '').trim();
  normalized = normalized.replace(/^rewritten prompt\s*[:：-]\s*/i, '').trim();

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

function extractTextContent(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (part && typeof part.text === 'string') {
          return part.text;
        }

        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

async function readErrorMessage(response: Response) {
  const rawText = await response.text().catch(() => '');

  if (!rawText) {
    return response.statusText || 'OpenRouter request failed';
  }

  try {
    const parsed = JSON.parse(rawText);
    if (typeof parsed?.error?.message === 'string') {
      return parsed.error.message;
    }
    if (typeof parsed?.message === 'string') {
      return parsed.message;
    }
  } catch {
    return rawText;
  }

  return rawText;
}

function isRetryableError(error: unknown) {
  if (error instanceof PromptRewriteError) {
    return error.status >= 500 || error.status === 429;
  }

  return error instanceof Error && error.name === 'AbortError';
}

async function requestRewrite(input: RewritePromptInput, headers: HeadersInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, OPENROUTER_REWRITE_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_REWRITE_ENDPOINT, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENROUTER_REWRITE_PRIMARY_MODEL,
        models: OPENROUTER_REWRITE_FALLBACK_MODELS,
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content:
              'You rewrite image-generation and video-generation prompts into safer versions for mogged workflows. Preserve the core visual idea, shot order, camera language, style, motion, mood, aspect ratio, and technical tokens when they are safe. Remove or replace policy-sensitive elements such as minors in unsafe contexts, nudity, sexual content, fetish framing, humiliating bodily interactions, graphic abuse, and other likely safety triggers. If the original request depends on disallowed content, redirect it into harmless slapstick, neutral comedy, or safe cinematic action. Return one production-ready prompt only. No markdown, no bullet points, no explanations, no quotes.',
          },
          {
            role: 'user',
            content: [
              `Workflow mode: ${buildModeLabel(input.mode)}`,
              `Source locale hint: ${input.locale || 'unknown'}`,
              'Rewrite this blocked prompt into a safer version that still feels useful for generation:',
              input.prompt,
            ].join('\n\n'),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response);
      throw new PromptRewriteError(
        response.status === 429 ? 'upstream_busy' : 'upstream_error',
        errorMessage,
        { status: response.status }
      );
    }

    const payload = await response.json();
    const rewrittenPrompt = sanitizeRewrittenPrompt(
      extractTextContent(payload)
    );

    if (!rewrittenPrompt) {
      throw new PromptRewriteError(
        'invalid_response',
        'openrouter returned an empty rewrite',
        { status: 502 }
      );
    }

    return {
      rewrittenPrompt,
      model:
        typeof payload?.model === 'string'
          ? payload.model
          : OPENROUTER_REWRITE_PRIMARY_MODEL,
      requestId: typeof payload?.id === 'string' ? payload.id : null,
    };
  } catch (error) {
    if (error instanceof PromptRewriteError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new PromptRewriteError('timeout', 'prompt rewrite timed out', {
        status: 504,
      });
    }

    throw new PromptRewriteError(
      'network_error',
      error instanceof Error ? error.message : 'openrouter request failed',
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestPromptRewrite(
  input: RewritePromptInput
): Promise<Omit<PromptRewriteResult, 'costCredits' | 'remainingCredits'>> {
  const prompt = input.prompt.trim();

  if (!prompt) {
    throw new PromptRewriteError(
      'invalid_input',
      'prompt is required for rewrite',
      { status: 400 }
    );
  }

  const configs = await getAllConfigs();
  const apiKey = configs.openrouter_api_key?.trim();

  if (!apiKey) {
    throw new PromptRewriteError(
      'config_missing',
      'openrouter_api_key is missing',
      { status: 503 }
    );
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': configs.app_url || 'https://mogged.games',
    'X-OpenRouter-Title': configs.app_name || 'mogged',
  };

  for (
    let attempt = 1;
    attempt <= OPENROUTER_REWRITE_MAX_RETRIES;
    attempt += 1
  ) {
    try {
      return await requestRewrite(
        {
          ...input,
          prompt,
        },
        headers
      );
    } catch (error) {
      const shouldRetry =
        attempt < OPENROUTER_REWRITE_MAX_RETRIES &&
        (error instanceof PromptRewriteError
          ? OPENROUTER_RETRYABLE_STATUS_CODES.has(error.status)
          : isRetryableError(error));

      console.error('[prompt-rewrite] request failed', {
        step: 'openrouter_request',
        userId: input.userId,
        mode: input.mode,
        promptLength: prompt.length,
        attempt,
        status: error instanceof PromptRewriteError ? error.status : undefined,
        code: error instanceof PromptRewriteError ? error.code : 'unknown',
        message: error instanceof Error ? error.message : 'unknown error',
      });

      if (!shouldRetry) {
        throw error;
      }
    }
  }

  throw new PromptRewriteError(
    'retry_exhausted',
    'prompt rewrite failed after bounded retries',
    { status: 503 }
  );
}

export async function rewritePromptForSafety(
  input: RewritePromptInput
): Promise<PromptRewriteResult> {
  try {
    return await executePromptToolWithCredits({
      tool: 'rewrite-prompt',
      prompt: input.prompt,
      mode: input.mode,
      locale: input.locale,
      userId: input.userId,
      execute: () => requestPromptRewrite(input),
    });
  } catch (error) {
    if (error instanceof PromptToolCreditsError) {
      throw new PromptRewriteError(error.code, error.message, {
        status: error.status,
      });
    }

    throw error;
  }
}
