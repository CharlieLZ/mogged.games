import { defineConfig } from 'drizzle-kit';

import { envConfigs } from '@/config';

export default defineConfig({
  schema: './src/config/db/schema.ts',
  dialect: envConfigs.database_provider as
    | 'sqlite'
    | 'postgresql'
    | 'mysql'
    | 'turso'
    | 'singlestore'
    | 'gel',
  ...(envConfigs.database_provider === 'postgresql'
    ? {
        schemaFilter: ['imageeditorai_net'],
      }
    : {}),
  dbCredentials: {
    url: envConfigs.database_url ?? '',
  },
});
