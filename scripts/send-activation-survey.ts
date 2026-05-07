/**
 * Send the 24h activation survey email to users who have not reached
 * their first successful generation yet.
 *
 * Usage:
 *   pnpm email:activation-survey -- --dry-run
 *   pnpm email:activation-survey -- --limit=20
 *   pnpm email:activation-survey -- --email=user@example.com --hours=0
 *   pnpm email:activation-survey -- --provider=resend
 */

import { pathToFileURL } from 'node:url';

import { DEFAULT_ACTIVATION_SURVEY_REWARD_CREDITS } from '@/shared/blocks/email/activation-survey';
import { ACTIVATION_SURVEY_EMAIL_SENT_EVENT } from '@/shared/lib/funnel';
import { getActivationSurveyEmailCandidates } from '@/shared/models/activation-survey';
import { safeRecordUserContextEvent } from '@/shared/models/user_context_event';
import { sendActivationSurveyEmail } from '@/shared/services/activation-survey-email';

export type ActivationSurveyDispatchOptions = {
  olderThanHours: number;
  limit: number;
  email?: string;
  provider?: string;
  dryRun: boolean;
};

function getArgValue(args: string[], name: string) {
  return args
    .filter((arg) => arg.startsWith(`--${name}=`))
    .map((arg) => arg.slice(name.length + 3));
}

function parseNumberArg(
  args: string[],
  name: string,
  fallback: number,
  min: number
) {
  const rawValue = getArgValue(args, name)[0];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue < min) {
    throw new Error(`--${name} must be an integer >= ${min}`);
  }

  return parsedValue;
}

export function parseActivationSurveyDispatchArgs(
  args: string[]
): ActivationSurveyDispatchOptions {
  const email = getArgValue(args, 'email')[0]?.trim().toLowerCase() || undefined;
  const provider = getArgValue(args, 'provider')[0]?.trim() || undefined;

  return {
    olderThanHours: parseNumberArg(args, 'hours', 24, 0),
    limit: parseNumberArg(args, 'limit', 50, 1),
    email,
    provider,
    dryRun: args.includes('--dry-run'),
  };
}

function printUsage() {
  console.log('Usage:');
  console.log('  pnpm email:activation-survey -- --dry-run');
  console.log('  pnpm email:activation-survey -- --limit=20');
  console.log(
    '  pnpm email:activation-survey -- --email=user@example.com --hours=0'
  );
  console.log('  pnpm email:activation-survey -- --provider=resend');
}

export async function runActivationSurveyDispatch(args: string[]) {
  const options = parseActivationSurveyDispatchArgs(args);
  const candidates = await getActivationSurveyEmailCandidates({
    olderThanHours: options.olderThanHours,
    limit: options.limit,
    email: options.email,
  });
  const summary = {
    matched: candidates.length,
    sent: 0,
    failed: 0,
    dryRun: options.dryRun,
  };

  console.log(
    `[activation-survey] matched ${candidates.length} user(s) older than ${options.olderThanHours}h`
  );

  for (const candidate of candidates) {
    if (options.dryRun) {
      console.log('[activation-survey] dry-run candidate', {
        userId: candidate.id,
        email: candidate.email,
        locale: candidate.locale,
        createdAt: candidate.createdAt.toISOString(),
      });
      continue;
    }

    const result = await sendActivationSurveyEmail({
      name: candidate.name,
      email: candidate.email,
      locale: candidate.locale,
      rewardCredits: DEFAULT_ACTIVATION_SURVEY_REWARD_CREDITS,
      provider: options.provider,
    });

    if (!result.success) {
      summary.failed += 1;
      continue;
    }

    summary.sent += 1;
    await safeRecordUserContextEvent({
      userId: candidate.id,
      eventType: ACTIVATION_SURVEY_EMAIL_SENT_EVENT,
      locale: candidate.locale,
      countryCode: candidate.countryCode,
      regionCode: candidate.regionCode,
      metadata: {
        email: candidate.email,
        rewardCredits: DEFAULT_ACTIVATION_SURVEY_REWARD_CREDITS,
        olderThanHours: options.olderThanHours,
        provider: result.provider,
      },
    });
  }

  console.log('[activation-survey] summary', summary);
  return summary;
}

async function main() {
  try {
    await runActivationSurveyDispatch(process.argv.slice(2));
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
