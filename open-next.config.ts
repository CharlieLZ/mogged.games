import {
  defineCloudflareConfig,
  type OpenNextConfig,
} from '@opennextjs/cloudflare';

export default {
  ...defineCloudflareConfig({}),
  buildCommand: 'pnpm build:next',
} satisfies OpenNextConfig;
