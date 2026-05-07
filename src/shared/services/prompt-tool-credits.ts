import 'server-only';

import {
  claimAIGenerateMemoryIdempotency,
  completeAIGenerateMemoryIdempotency,
  createAIGenerateRequestHash,
  failAIGenerateMemoryIdempotency,
  isAIGenerateIdempotencyStorageError,
  parseAIGenerateIdempotencyResponse,
} from '@/shared/lib/ai-generate-idempotency';
import {
  getPromptToolChargeDescription,
  getPromptToolCostCredits,
  type PromptToolKind,
  type PromptToolMode,
} from '@/shared/lib/prompt-tools';
import { getUuid } from '@/shared/lib/hash';
import {
  AIGenerateIdempotencyStatus,
  claimAIGenerateIdempotency,
  completeAIGenerateIdempotency,
  failAIGenerateIdempotency,
} from '@/shared/models/ai_generate_idempotency';
import { consumeCredits, getRemainingCredits } from '@/shared/models/credit';

const PROMPT_TOOL_IDEMPOTENCY_SCOPE_PREFIX = 'prompt-tool';
const PROMPT_TOOL_IDEMPOTENCY_KEY_PREFIX = 'prompttool';
const PROMPT_TOOL_FAILED_RETRY_TTL_MS = 1_000;

type PromptToolExecutionResult = Record<string, unknown> & {
  model?: string;
  requestId?: string | null;
};

type ExecutePromptToolWithCreditsInput<TResult extends PromptToolExecutionResult> =
  {
    tool: PromptToolKind;
    prompt: string;
    mode: PromptToolMode;
    locale: string;
    userId: string;
    execute: () => Promise<TResult>;
  };

export type PromptToolBilledResult = {
  costCredits: number;
  remainingCredits: number;
};

export class PromptToolCreditsError extends Error {
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
    this.name = 'PromptToolCreditsError';
    this.code = code;
    this.status = options?.status ?? 500;
  }
}

type ClaimedPromptToolIdempotency = {
  key: string;
  scope: string;
  storage: 'db' | 'memory';
};

function buildPromptToolScope(tool: PromptToolKind) {
  return `${PROMPT_TOOL_IDEMPOTENCY_SCOPE_PREFIX}:${tool}`;
}

function buildPromptToolIdempotencyKey(requestHash: string) {
  return `${PROMPT_TOOL_IDEMPOTENCY_KEY_PREFIX}_${requestHash.slice(0, 48)}`;
}

function getPromptToolFailedMessage(tool: PromptToolKind) {
  switch (tool) {
    case 'rewrite-prompt':
      return 'same prompt rewrite request failed recently, please retry in a moment';
    case 'translate-prompt':
    default:
      return 'same prompt translation request failed recently, please retry in a moment';
  }
}

function getPromptToolProcessingMessage(tool: PromptToolKind) {
  switch (tool) {
    case 'rewrite-prompt':
      return 'same prompt rewrite request is already processing';
    case 'translate-prompt':
    default:
      return 'same prompt translation request is already processing';
  }
}

async function claimPromptToolIdempotency({
  userId,
  scope,
  idempotencyKey,
  requestHash,
}: {
  userId: string;
  scope: string;
  idempotencyKey: string;
  requestHash: string;
}) {
  try {
    const result = await claimAIGenerateIdempotency({
      userId,
      scope,
      idempotencyKey,
      requestHash,
    });

    return {
      result,
      storage: 'db' as const,
    };
  } catch (error) {
    if (!isAIGenerateIdempotencyStorageError(error)) {
      throw error;
    }

    console.warn('[prompt-tool-credits] idempotency storage degraded to memory', {
      userId,
      scope,
      idempotencyKey,
      error,
    });

    return {
      result: claimAIGenerateMemoryIdempotency({
        userId,
        scope,
        idempotencyKey,
        requestHash,
      }),
      storage: 'memory' as const,
    };
  }
}

async function completePromptToolIdempotency({
  claim,
  userId,
  tool,
  requestId,
  responsePayload,
}: {
  claim: ClaimedPromptToolIdempotency;
  userId: string;
  tool: PromptToolKind;
  requestId?: string | null;
  responsePayload: Record<string, unknown>;
}) {
  if (claim.storage === 'memory') {
    completeAIGenerateMemoryIdempotency({
      userId,
      scope: claim.scope,
      idempotencyKey: claim.key,
      responsePayload,
    });
    return;
  }

  await completeAIGenerateIdempotency({
    userId,
    scope: claim.scope,
    idempotencyKey: claim.key,
    aiTaskId: `prompt_tool:${tool}:${requestId || getUuid()}`,
    responsePayload,
  });
}

async function failPromptToolIdempotency({
  claim,
  userId,
  errorMessage,
}: {
  claim: ClaimedPromptToolIdempotency;
  userId: string;
  errorMessage?: string;
}) {
  if (claim.storage === 'memory') {
    failAIGenerateMemoryIdempotency({
      userId,
      scope: claim.scope,
      idempotencyKey: claim.key,
      errorMessage,
      ttlMs: PROMPT_TOOL_FAILED_RETRY_TTL_MS,
    });
    return;
  }

  await failAIGenerateIdempotency({
    userId,
    scope: claim.scope,
    idempotencyKey: claim.key,
    errorMessage,
    ttlMs: PROMPT_TOOL_FAILED_RETRY_TTL_MS,
  });
}

function readCachedPromptToolResponse<TResult extends PromptToolExecutionResult>(
  responsePayload?: string | Record<string, unknown> | null
) {
  if (responsePayload && typeof responsePayload === 'object') {
    return responsePayload as TResult & PromptToolBilledResult;
  }

  const cached = parseAIGenerateIdempotencyResponse(responsePayload);
  if (!cached) {
    return null;
  }

  return cached as TResult & PromptToolBilledResult;
}

export async function executePromptToolWithCredits<
  TResult extends PromptToolExecutionResult,
>(
  input: ExecutePromptToolWithCreditsInput<TResult>
): Promise<TResult & PromptToolBilledResult> {
  const prompt = input.prompt.trim();
  const scope = buildPromptToolScope(input.tool);
  const costCredits = getPromptToolCostCredits(input.tool);
  const requestHash = await createAIGenerateRequestHash({
    tool: input.tool,
    prompt,
    mode: input.mode,
    locale: input.locale,
    costCredits,
  });
  const idempotencyKey = buildPromptToolIdempotencyKey(requestHash);

  let claimedIdempotency: ClaimedPromptToolIdempotency | null = null;

  try {
    const claim = await claimPromptToolIdempotency({
      userId: input.userId,
      scope,
      idempotencyKey,
      requestHash,
    });

    if (claim.result.kind === 'existing') {
      if (claim.result.record.requestHash !== requestHash) {
        throw new PromptToolCreditsError(
          'request_conflict',
          'prompt tool idempotency key conflicts with a different payload',
          { status: 409 }
        );
      }

      if (claim.result.record.status === AIGenerateIdempotencyStatus.COMPLETED) {
        const cachedResponse = readCachedPromptToolResponse<TResult>(
          claim.result.record.responsePayload
        );

        if (cachedResponse) {
          return cachedResponse;
        }
      }

      if (claim.result.record.status === AIGenerateIdempotencyStatus.PROCESSING) {
        throw new PromptToolCreditsError(
          'request_processing',
          getPromptToolProcessingMessage(input.tool),
          { status: 409 }
        );
      }

      throw new PromptToolCreditsError(
        'request_failed',
        claim.result.record.errorMessage || getPromptToolFailedMessage(input.tool),
        { status: 409 }
      );
    }

    claimedIdempotency = {
      key: idempotencyKey,
      scope,
      storage: claim.storage,
    };

    const remainingCreditsBefore = await getRemainingCredits(input.userId);
    if (remainingCreditsBefore < costCredits) {
      throw new PromptToolCreditsError(
        'insufficient_credits',
        'insufficient credits',
        { status: 402 }
      );
    }

    const result = await input.execute();

    await consumeCredits({
      userId: input.userId,
      credits: costCredits,
      scene: input.tool,
      description: getPromptToolChargeDescription(input.tool),
      metadata: {
        type: 'prompt-tool',
        promptTool: input.tool,
        mode: input.mode,
        locale: input.locale,
        model: result.model ?? null,
        requestId: result.requestId ?? null,
        promptLength: prompt.length,
        requestHash,
      },
    });

    const remainingCredits = await getRemainingCredits(input.userId);
    const responsePayload = {
      ...result,
      costCredits,
      remainingCredits,
    };

    if (claimedIdempotency) {
      await completePromptToolIdempotency({
        claim: claimedIdempotency,
        userId: input.userId,
        tool: input.tool,
        requestId:
          typeof result.requestId === 'string' ? result.requestId : null,
        responsePayload,
      });
    }

    return responsePayload;
  } catch (error) {
    if (claimedIdempotency) {
      await failPromptToolIdempotency({
        claim: claimedIdempotency,
        userId: input.userId,
        errorMessage: error instanceof Error ? error.message : 'unknown error',
      }).catch((idempotencyError) => {
        console.warn('[prompt-tool-credits] failed to mark idempotency failed', {
          userId: input.userId,
          scope,
          idempotencyKey,
          error: idempotencyError,
        });
      });
    }

    throw error;
  }
}
