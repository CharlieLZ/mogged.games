import 'server-only';

import { type PromptToolMode } from '@/shared/lib/prompt-tools';
import { getAllConfigs } from '@/shared/models/config';
import {
  executePromptToolWithCredits,
  type PromptToolBilledResult,
  PromptToolCreditsError,
} from '@/shared/services/prompt-tool-credits';

const OPENROUTER_TRANSLATION_ENDPOINT =
  'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_TRANSLATION_PRIMARY_MODEL = 'openai/gpt-5-mini';
const OPENROUTER_TRANSLATION_FALLBACK_MODELS = ['google/gemini-2.5-flash'];
const OPENROUTER_TRANSLATION_MAX_RETRIES = 2;
const OPENROUTER_TRANSLATION_TIMEOUT_MS = 15_000;
const OPENROUTER_RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

type TranslatePromptInput = {
  prompt: string;
  mode: PromptToolMode;
  locale: string;
  userId: string;
};

export type PromptTranslationResult = {
  translatedPrompt: string;
  model: string;
  requestId: string | null;
  targetLanguage: 'en';
} & PromptToolBilledResult;

export class PromptTranslationError extends Error {
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
    this.name = 'PromptTranslationError';
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

function sanitizeTranslatedPrompt(raw: string) {
  let normalized = raw.trim();

  normalized = normalized.replace(/^english\s*[:：-]\s*/i, '').trim();

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
  if (error instanceof PromptTranslationError) {
    return error.status >= 500 || error.status === 429;
  }

  return error instanceof Error && error.name === 'AbortError';
}

async function requestTranslation(
  input: TranslatePromptInput,
  headers: HeadersInit
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, OPENROUTER_TRANSLATION_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_TRANSLATION_ENDPOINT, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENROUTER_TRANSLATION_PRIMARY_MODEL,
        models: OPENROUTER_TRANSLATION_FALLBACK_MODELS,
        temperature: 0.1,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content:
              'You translate and lightly optimize image-generation and video-generation prompts into natural English for mogged workflows. Return English only. No markdown, no bullet points, no explanations, no quotes. Preserve motion, camera language, style, mood, ordering, aspect ratios, durations, URLs, @mentions, and any technical tokens exactly when present. If the prompt is already good English, keep it close and only do minimal cleanup.',
          },
          {
            role: 'user',
            content: [
              `Workflow mode: ${buildModeLabel(input.mode)}`,
              `Source locale hint: ${input.locale || 'unknown'}`,
              'Translate this prompt to English and keep it directly usable for generation:',
              input.prompt,
            ].join('\n\n'),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response);
      throw new PromptTranslationError(
        response.status === 429 ? 'upstream_busy' : 'upstream_error',
        errorMessage,
        { status: response.status }
      );
    }

    const payload = await response.json();
    const translatedPrompt = sanitizeTranslatedPrompt(extractTextContent(payload));

    if (!translatedPrompt) {
      throw new PromptTranslationError(
        'invalid_response',
        'openrouter returned an empty translation',
        { status: 502 }
      );
    }

    return {
      translatedPrompt,
      model:
        typeof payload?.model === 'string'
          ? payload.model
          : OPENROUTER_TRANSLATION_PRIMARY_MODEL,
      requestId: typeof payload?.id === 'string' ? payload.id : null,
      targetLanguage: 'en' as const,
    };
  } catch (error) {
    if (error instanceof PromptTranslationError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new PromptTranslationError(
        'timeout',
        'prompt translation timed out',
        { status: 504 }
      );
    }

    throw new PromptTranslationError(
      'network_error',
      error instanceof Error ? error.message : 'openrouter request failed',
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestPromptTranslation(
  input: TranslatePromptInput
): Promise<Omit<PromptTranslationResult, 'costCredits' | 'remainingCredits'>> {
  const prompt = input.prompt.trim();

  if (!prompt) {
    throw new PromptTranslationError(
      'invalid_input',
      'prompt is required for translation',
      { status: 400 }
    );
  }

  const configs = await getAllConfigs();
  const apiKey = configs.openrouter_api_key?.trim();

  if (!apiKey) {
    throw new PromptTranslationError(
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
    attempt <= OPENROUTER_TRANSLATION_MAX_RETRIES;
    attempt += 1
  ) {
    try {
      return await requestTranslation(
        {
          ...input,
          prompt,
        },
        headers
      );
    } catch (error) {
      const shouldRetry =
        attempt < OPENROUTER_TRANSLATION_MAX_RETRIES &&
        (error instanceof PromptTranslationError
          ? OPENROUTER_RETRYABLE_STATUS_CODES.has(error.status)
          : isRetryableError(error));

      console.error('[prompt-translation] request failed', {
        step: 'openrouter_request',
        userId: input.userId,
        mode: input.mode,
        promptLength: prompt.length,
        attempt,
        status: error instanceof PromptTranslationError ? error.status : undefined,
        code: error instanceof PromptTranslationError ? error.code : 'unknown',
        message: error instanceof Error ? error.message : 'unknown error',
      });

      if (!shouldRetry) {
        throw error;
      }
    }
  }

  throw new PromptTranslationError(
    'retry_exhausted',
    'prompt translation failed after bounded retries',
    { status: 503 }
  );
}

export async function translatePromptToEnglish(
  input: TranslatePromptInput
): Promise<PromptTranslationResult> {
  try {
    return await executePromptToolWithCredits({
      tool: 'translate-prompt',
      prompt: input.prompt,
      mode: input.mode,
      locale: input.locale,
      userId: input.userId,
      execute: () => requestPromptTranslation(input),
    });
  } catch (error) {
    if (error instanceof PromptToolCreditsError) {
      throw new PromptTranslationError(error.code, error.message, {
        status: error.status,
      });
    }

    throw error;
  }
}
