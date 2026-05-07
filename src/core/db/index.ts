import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { envConfigs } from '@/config';
import { getOptionalCloudflareRuntimeEnv } from '@/shared/lib/cloudflare';
import { isCloudflareWorker } from '@/shared/lib/env';

let dbInstance: ReturnType<typeof drizzle> | null = null;
let client: ReturnType<typeof postgres> | null = null;

function extractHostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

function dbConnectTimeout(): number {
  const parsed = Number(envConfigs.db_connect_timeout);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

function dbConnectMaxRetries(): number {
  const parsed = Number(envConfigs.db_connect_max_retries);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
function createPostgresClient(databaseUrl: string, overrides: postgres.Options<{}>): ReturnType<typeof postgres> {
  const host = extractHostFromUrl(databaseUrl);
  const maxRetries = dbConnectMaxRetries();
  const timeout = dbConnectTimeout();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return postgres(databaseUrl, {
        ...overrides,
        connect_timeout: timeout,
      });
    } catch (error) {
      if (attempt === maxRetries) {
        const baseMsg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Database connection to ${host} failed after ${maxRetries + 1} attempts. ${baseMsg}`,
          { cause: error },
        );
      }
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      console.warn(`Database connection attempt ${attempt + 1} to ${host} failed, retrying in ${delay}ms`);
    }
  }

  throw new Error(`Database connection to ${host} failed after ${maxRetries + 1} attempts`);
}

export function db() {
  let databaseUrl = envConfigs.database_url;

  let isHyperdrive = false;

  if (isCloudflareWorker) {
    const env = getOptionalCloudflareRuntimeEnv();
    isHyperdrive = !!env?.HYPERDRIVE;

    if (isHyperdrive) {
      const hyperdrive = env?.HYPERDRIVE;
      databaseUrl = hyperdrive?.connectionString || databaseUrl;
      console.log('using Hyperdrive connection');
    }
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  if (isCloudflareWorker) {
    console.log('in Cloudflare Workers environment');
    const client = createPostgresClient(databaseUrl, {
      prepare: false,
      max: 1,
      idle_timeout: 10,
    });
    return drizzle(client);
  }

  if (envConfigs.db_singleton_enabled === 'true') {
    if (dbInstance) {
      return dbInstance;
    }

    client = createPostgresClient(databaseUrl, {
      prepare: false,
      max: Number(envConfigs.db_max_connections) || 1,
      idle_timeout: 30,
    });

    dbInstance = drizzle({ client });
    return dbInstance;
  }

  const serverlessClient = createPostgresClient(databaseUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
  });

  return drizzle({ client: serverlessClient });
}

export async function closeDb() {
  if (envConfigs.db_singleton_enabled && client) {
    await client.end();
    client = null;
    dbInstance = null;
  }
}
