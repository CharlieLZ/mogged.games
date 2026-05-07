import './server-only-shim.js';

import { pathToFileURL } from 'node:url';

import { asc, eq, sql } from 'drizzle-orm';

import { aiTask } from '@/config/db/schema';
import { db } from '@/core/db';
import {
  buildLegacyAITaskJsonbPatch,
} from './backfill-ai-task-jsonb.shared';

export type BackfillLegacyAITaskJsonbOptions = {
  dryRun?: boolean;
  batchSize?: number;
  maxBatches?: number;
};

export type BackfillLegacyAITaskJsonbSummary = {
  dryRun: boolean;
  batchSize: number;
  maxBatches: number;
  batches: number;
  scanned: number;
  updated: number;
  skipped: number;
  taskInfoUpdated: number;
  taskResultUpdated: number;
};

function printUsage() {
  console.log(
    [
      'Usage:',
      '  pnpm ai:backfill-task-jsonb -- --dry-run',
      '  pnpm ai:backfill-task-jsonb -- --batch-size=200 --max-batches=20',
    ].join('\n')
  );
}

function parseIntegerFlag(args: string[], name: string, fallback: number) {
  const raw = args.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) {
    return fallback;
  }

  const value = Number(raw.split('=')[1]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

async function findLegacyCandidates(limit: number) {
  return db()
    .select({
      id: aiTask.id,
      taskInfoRaw: sql<string | null>`case
        when ${aiTask.taskInfo} is not null and jsonb_typeof(${aiTask.taskInfo}) = 'string'
        then ${aiTask.taskInfo} #>> '{}'
        else null
      end`,
      taskResultRaw: sql<string | null>`case
        when ${aiTask.taskResult} is not null and jsonb_typeof(${aiTask.taskResult}) = 'string'
        then ${aiTask.taskResult} #>> '{}'
        else null
      end`,
    })
    .from(aiTask)
    .where(sql`(
      ${aiTask.taskInfo} is not null and jsonb_typeof(${aiTask.taskInfo}) = 'string'
    ) or (
      ${aiTask.taskResult} is not null and jsonb_typeof(${aiTask.taskResult}) = 'string'
    )`)
    .orderBy(asc(aiTask.createdAt))
    .limit(limit);
}

export async function backfillLegacyAITaskJsonb(
  options: BackfillLegacyAITaskJsonbOptions = {}
): Promise<BackfillLegacyAITaskJsonbSummary> {
  const dryRun = options.dryRun ?? false;
  const batchSize = options.batchSize ?? 200;
  const maxBatches = options.maxBatches ?? 20;

  const summary: BackfillLegacyAITaskJsonbSummary = {
    dryRun,
    batchSize,
    maxBatches,
    batches: 0,
    scanned: 0,
    updated: 0,
    skipped: 0,
    taskInfoUpdated: 0,
    taskResultUpdated: 0,
  };

  while (summary.batches < maxBatches) {
    const candidates = await findLegacyCandidates(batchSize);
    if (candidates.length === 0) {
      break;
    }

    summary.batches += 1;

    for (const candidate of candidates) {
      summary.scanned += 1;
      const patch = buildLegacyAITaskJsonbPatch(candidate);

      if (!patch) {
        summary.skipped += 1;
        continue;
      }

      if (patch.taskInfo) {
        summary.taskInfoUpdated += 1;
      }
      if (patch.taskResult) {
        summary.taskResultUpdated += 1;
      }

      if (dryRun) {
        summary.updated += 1;
        console.log('[ai-task-jsonb-backfill] dry-run candidate', {
          id: candidate.id,
          patchKeys: Object.keys(patch),
        });
        continue;
      }

      await db()
        .update(aiTask)
        .set(patch)
        .where(eq(aiTask.id, candidate.id));
      summary.updated += 1;
    }

    if (dryRun) {
      break;
    }
  }

  return summary;
}

export async function main(args: string[] = process.argv.slice(2)) {
  if (args.includes('--help')) {
    printUsage();
    return;
  }

  const summary = await backfillLegacyAITaskJsonb({
    dryRun: args.includes('--dry-run'),
    batchSize: parseIntegerFlag(args, 'batch-size', 200),
    maxBatches: parseIntegerFlag(args, 'max-batches', 20),
  });

  console.log('[ai-task-jsonb-backfill] completed', summary);
}

const entryScript = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;

if (entryScript && import.meta.url === entryScript) {
  main().catch((error) => {
    console.error('[ai-task-jsonb-backfill] failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  });
}
