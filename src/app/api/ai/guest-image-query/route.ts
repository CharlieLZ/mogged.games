import { z } from 'zod';

import { isKieImageProvider } from '@/extensions/ai/kie-market/types';
import { rateLimit } from '@/shared/lib/api/rate-limit';
import {
  createApiPreflightResponse,
  enforceApiWriteSecurity,
} from '@/shared/lib/api/request-security';
import { parseDbJsonValue, stringifyDbJsonValue } from '@/shared/lib/db-json';
import { verifyGuestTaskToken } from '@/shared/lib/guest-task-token';
import { isPostgresUndefinedTableError } from '@/shared/lib/postgres-error';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import {
  findGuestAITaskForViewer,
  updateGuestAITaskById,
} from '@/shared/models/guest_ai_task';
import { resolveRequestViewer } from '@/shared/services/guest-viewer';
import { getKieImageService } from '@/shared/services/kie-image';

const guestQueryLimiter = rateLimit({
  uniqueTokenPerInterval: 120,
  interval: 60 * 1000,
});

const guestQueryPayloadSchema = z.object({
  taskId: z.string().trim().min(1),
  taskToken: z.string().trim().min(1),
});

function normalizeTaskResponse<
  T extends {
    options?: unknown;
    taskInfo?: unknown;
    taskResult?: unknown;
  },
>(task: T) {
  return {
    ...task,
    options: parseDbJsonValue(task.options),
    taskInfo: parseDbJsonValue(task.taskInfo),
    taskResult: parseDbJsonValue(task.taskResult),
  };
}

export function OPTIONS() {
  return createApiPreflightResponse();
}

export async function POST(request: Request) {
  try {
    const securityResponse = await enforceApiWriteSecurity(
      request,
      'ai-guest-image-query-post'
    );
    if (securityResponse) {
      return securityResponse;
    }

    const viewer = await resolveRequestViewer({ allowGuest: true, request });
    if (!viewer) {
      return respErrWithStatus('guest unavailable', 503);
    }

    if (!viewer.isGuest) {
      return respErrWithStatus('authenticated_user_use_account_credits', 409);
    }

    const rate = await guestQueryLimiter(
      `ai-guest-image-query:${viewer.ipHash}:${viewer.id}`
    );
    if (!rate.success) {
      return respErrWithStatus('too many guest query attempts', 429);
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return respErrWithStatus('invalid guest query payload', 400);
    }

    const body = guestQueryPayloadSchema.safeParse(rawBody);
    if (!body.success) {
      return respErrWithStatus('invalid guest query payload', 400);
    }

    const task = await findGuestAITaskForViewer({
      id: body.data.taskId,
      guestIdHash: viewer.guestIdHash,
    });
    if (!task || !task.providerTaskId) {
      return respErrWithStatus('task not found', 404);
    }

    if (
      !verifyGuestTaskToken({
        guestIdHash: viewer.guestIdHash,
        taskId: task.id,
        token: body.data.taskToken,
      })
    ) {
      return respErrWithStatus('invalid guest task token', 403);
    }

    if (!isKieImageProvider(task.provider)) {
      return respErrWithStatus('guest task provider is not supported', 400);
    }

    const kieImageService = await getKieImageService();
    const result = await kieImageService.query({
      taskId: task.providerTaskId,
      tier: 'free',
    });

    if (!result?.taskStatus) {
      return respErrWithStatus('query guest task failed', 502);
    }

    const updateTask = {
      status: result.taskStatus,
      taskInfo: result.taskInfo ?? null,
      taskResult: result.taskResult ?? null,
    };

    const hasChanges =
      updateTask.status !== task.status ||
      stringifyDbJsonValue(updateTask.taskInfo) !==
        stringifyDbJsonValue(task.taskInfo) ||
      stringifyDbJsonValue(updateTask.taskResult) !==
        stringifyDbJsonValue(task.taskResult);

    const nextTask = hasChanges
      ? await updateGuestAITaskById(task.id, updateTask)
      : task;

    return respData(
      normalizeTaskResponse({
        ...(nextTask || task),
        status: updateTask.status || task.status,
        taskInfo: updateTask.taskInfo ?? (nextTask || task).taskInfo,
        taskResult: updateTask.taskResult ?? (nextTask || task).taskResult,
      })
    );
  } catch (error) {
    console.error('[guest-image-query] failed', {
      step: 'query',
      error,
    });

    if (isPostgresUndefinedTableError(error)) {
      return respErrWithStatus(
        'guest image query is temporarily unavailable',
        503
      );
    }

    return respErrWithStatus(
      error instanceof Error ? error.message : 'guest image query failed',
      500
    );
  }
}
