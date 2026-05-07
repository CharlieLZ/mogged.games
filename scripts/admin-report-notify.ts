import { pathToFileURL } from 'node:url';

import {
  ADMIN_REPORT_FREQUENCIES,
  type AdminReportFrequency,
} from '@/shared/lib/admin-report-period';
import { dispatchAdminReportDigest } from '@/shared/services/admin-report-dispatch';
import { preloadLocalEnvFiles } from './lib/local-env';

export type AdminReportNotifyOptions = {
  frequency: AdminReportFrequency | 'all';
  timezone?: string;
  now?: Date;
  dryRun: boolean;
};

function getArgValue(args: string[], name: string) {
  return args
    .filter((arg) => arg.startsWith(`--${name}=`))
    .map((arg) => arg.slice(name.length + 3))[0];
}

function parseNowArg(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('--now must be a valid ISO datetime');
  }

  return parsed;
}

function parseFrequencyArg(value?: string): AdminReportNotifyOptions['frequency'] {
  if (!value) {
    return 'all';
  }

  if (value === 'all') {
    return value;
  }

  if (ADMIN_REPORT_FREQUENCIES.includes(value as AdminReportFrequency)) {
    return value as AdminReportFrequency;
  }

  throw new Error(
    `--frequency must be one of: all, ${ADMIN_REPORT_FREQUENCIES.join(', ')}`
  );
}

export function parseAdminReportNotifyArgs(
  args: string[]
): AdminReportNotifyOptions {
  return {
    frequency: parseFrequencyArg(getArgValue(args, 'frequency')),
    timezone: getArgValue(args, 'timezone')?.trim() || undefined,
    now: parseNowArg(getArgValue(args, 'now')),
    dryRun: args.includes('--dry-run'),
  };
}

function printUsage() {
  console.log('Usage:');
  console.log('  pnpm email:admin-report -- --dry-run');
  console.log('  pnpm email:admin-report -- --frequency=daily');
  console.log(
    '  pnpm email:admin-report -- --frequency=weekly --timezone=Asia/Shanghai'
  );
  console.log(
    '  pnpm email:admin-report -- --frequency=monthly --now=2026-05-06T00:10:00.000Z'
  );
}

export async function runAdminReportNotify(args: string[]) {
  const options = parseAdminReportNotifyArgs(args);
  const frequencies =
    options.frequency === 'all'
      ? [...ADMIN_REPORT_FREQUENCIES]
      : [options.frequency];
  const results = [];

  for (const frequency of frequencies) {
    const result = await dispatchAdminReportDigest({
      frequency,
      now: options.now,
      timezone: options.timezone,
      dryRun: options.dryRun,
    });

    console.log('[admin-report]', result);
    results.push(result);
  }

  return options.frequency === 'all' ? results : results[0];
}

async function main() {
  try {
    preloadLocalEnvFiles(process.cwd());
    await runAdminReportNotify(process.argv.slice(2));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    printUsage();
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
