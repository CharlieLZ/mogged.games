import { parseDbJsonValue } from '@/shared/lib/db-json';

export type StructuredJsonValue = Record<string, unknown> | unknown[];

export type LegacyAITaskJsonbCandidate = {
  id: string;
  taskInfoRaw: string | null;
  taskResultRaw: string | null;
};

function normalizeLegacyJsonbString(
  value: string | null | undefined
): StructuredJsonValue | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = parseDbJsonValue(normalized);
  if (parsed && typeof parsed === 'object') {
    return parsed as StructuredJsonValue;
  }

  return undefined;
}

export function buildLegacyAITaskJsonbPatch(
  candidate: LegacyAITaskJsonbCandidate
) {
  const patch: {
    taskInfo?: StructuredJsonValue;
    taskResult?: StructuredJsonValue;
  } = {};

  const taskInfo = normalizeLegacyJsonbString(candidate.taskInfoRaw);
  if (taskInfo !== undefined) {
    patch.taskInfo = taskInfo;
  }

  const taskResult = normalizeLegacyJsonbString(candidate.taskResultRaw);
  if (taskResult !== undefined) {
    patch.taskResult = taskResult;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}
