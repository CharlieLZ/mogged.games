import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import postgres from 'postgres';

import { envConfigs } from '@/config';
import dbConfig from '@/core/db/config';

type RunDbPushOptions = {
  databaseProvider: string;
  databaseUrl: string;
  schemaFilter?: string[];
  ensureSchemaExists?: (input: {
    databaseUrl: string;
    schema: string;
  }) => Promise<void>;
  spawnPush?: () => number;
};

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export async function ensureSchemaExists(input: {
  databaseUrl: string;
  schema: string;
}) {
  const sql = postgres(input.databaseUrl, {
    max: 1,
    prepare: false,
  });

  try {
    await sql.unsafe(
      `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(input.schema)}`
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function runDrizzlePushCommand() {
  const result = spawnSync(
    'npx',
    ['drizzle-kit', 'push', '--config=src/core/db/config.ts'],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    }
  );

  return result.status ?? 1;
}

export async function runDbPush(options: RunDbPushOptions) {
  const schema = options.schemaFilter?.[0];

  if (
    options.databaseProvider === 'postgresql' &&
    options.databaseUrl &&
    schema
  ) {
    await (options.ensureSchemaExists ?? ensureSchemaExists)({
      databaseUrl: options.databaseUrl,
      schema,
    });
  }

  return (options.spawnPush ?? runDrizzlePushCommand)();
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return import.meta.url === pathToFileURL(entry).href;
}

async function main() {
  const exitCode = await runDbPush({
    databaseProvider: envConfigs.database_provider,
    databaseUrl: envConfigs.database_url ?? '',
    schemaFilter: Array.isArray(dbConfig.schemaFilter)
      ? dbConfig.schemaFilter
      : undefined,
  });

  process.exitCode = exitCode;
}

if (isMainModule()) {
  void main();
}
