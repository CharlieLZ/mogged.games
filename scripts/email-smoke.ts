/**
 * Email Smoke Test Script
 *
 * Usage:
 *   pnpm email:smoke -- --to=user@example.com
 *   pnpm email:smoke -- --to=user@example.com --provider=resend
 *   pnpm email:smoke -- --to=user@example.com --dry-run
 */

import { pathToFileURL } from 'node:url';

import { envConfigs } from '@/config';
import type { EmailMessage } from '@/extensions/email';

export type EmailSmokeOptions = {
  to: string[];
  provider?: string;
  subject: string;
  code: string;
  dryRun: boolean;
};

function getArgValue(args: string[], name: string) {
  return args
    .filter((arg) => arg.startsWith(`--${name}=`))
    .map((arg) => arg.slice(name.length + 3));
}

function parseRecipients(args: string[]) {
  return getArgValue(args, 'to')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function parseEmailSmokeArgs(args: string[]): EmailSmokeOptions {
  const to = Array.from(new Set(parseRecipients(args)));
  const subject =
    getArgValue(args, 'subject')[0]?.trim() ||
    `[${envConfigs.app_name}] email smoke test`;
  const provider = getArgValue(args, 'provider')[0]?.trim() || undefined;
  const code = getArgValue(args, 'code')[0]?.trim() || '123456';
  const dryRun = args.includes('--dry-run');

  if (to.length === 0) {
    throw new Error('Please provide at least one recipient via --to=');
  }

  return {
    to,
    provider,
    subject,
    code,
    dryRun,
  };
}

export function buildEmailSmokeMessage(
  options: Pick<EmailSmokeOptions, 'to' | 'subject' | 'code'>
): EmailMessage {
  const appName = envConfigs.app_name || 'mogged';
  const appUrl = envConfigs.app_url || 'https://mogged.games';
  const sentAt = new Date().toISOString();

  return {
    to: options.to,
    subject: options.subject,
    text: [
      `${appName} email smoke test`,
      '',
      `Verification code: ${options.code}`,
      `Sent at: ${sentAt}`,
      `App URL: ${appUrl}`,
      '',
      'If you received this, the email provider is working.',
    ].join('\n'),
    html: [
      '<div style="font-family:Arial,sans-serif;line-height:1.6;padding:24px;">',
      `<h1 style="margin:0 0 12px;">${appName} email smoke test</h1>`,
      '<p style="margin:0 0 12px;">If you received this, the email provider is working.</p>',
      `<p style="margin:0 0 12px;"><strong>Verification code:</strong> ${options.code}</p>`,
      `<p style="margin:0 0 12px;"><strong>Sent at:</strong> ${sentAt}</p>`,
      `<p style="margin:0;"><strong>App URL:</strong> <a href="${appUrl}">${appUrl}</a></p>`,
      '</div>',
    ].join(''),
    headers: {
      'X-ImageEditorAi-Smoke-Test': 'true',
    },
    tags: ['smoke-test'],
  };
}

function printUsage() {
  console.log('Usage:');
  console.log('  pnpm email:smoke -- --to=user@example.com');
  console.log(
    '  pnpm email:smoke -- --to=user@example.com --provider=resend'
  );
  console.log(
    '  pnpm email:smoke -- --to=user@example.com --subject="Smoke Test" --code=654321'
  );
  console.log('  pnpm email:smoke -- --to=user@example.com --dry-run');
}

async function loadScriptConfigs() {
  const configs = { ...envConfigs };

  if (!envConfigs.database_url) {
    return configs;
  }

  try {
    const [{ db }, { config }] = await Promise.all([
      import('@/core/db'),
      import('@/config/db/schema'),
    ]);

    const dbConfigs = await db().select().from(config);
    for (const item of dbConfigs) {
      if (item.value === '' || item.value === undefined || item.value === null) {
        continue;
      }

      configs[item.name] = item.value;
    }
  } catch (error) {
    console.warn('[email:smoke] failed to load db configs, falling back to env', error);
  }

  return configs;
}

export async function runEmailSmoke(args: string[]) {
  const options = parseEmailSmokeArgs(args);
  const [{ getEmailServiceWithConfigs }, configs] = await Promise.all([
    import('@/shared/services/email'),
    loadScriptConfigs(),
  ]);
  const emailService = getEmailServiceWithConfigs(configs);
  const providerNames = emailService.getProviderNames();
  const message = buildEmailSmokeMessage(options);

  console.log('[email:smoke] available providers:', providerNames.join(', ') || '(none)');
  console.log('[email:smoke] recipients:', options.to.join(', '));
  console.log('[email:smoke] subject:', options.subject);
  if (options.provider) {
    console.log('[email:smoke] requested provider:', options.provider);
  }

  if (options.dryRun) {
    console.log('[email:smoke] dry run enabled, no email sent');
    console.log(
      JSON.stringify(
        {
          ...message,
          html: '[omitted]',
          text: message.text,
        },
        null,
        2
      )
    );
    return;
  }

  const result = options.provider
    ? await emailService.sendEmailWithProvider(message, options.provider)
    : await emailService.sendEmail(message);

  if (!result.success) {
    throw new Error(
      `[email:smoke] failed via ${result.provider}: ${result.error || 'unknown error'}`
    );
  }

  console.log(
    `[email:smoke] success via ${result.provider}, messageId=${result.messageId || 'n/a'}`
  );
}

async function main() {
  try {
    await runEmailSmoke(process.argv.slice(2));
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
