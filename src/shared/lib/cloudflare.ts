import 'server-only';

import { getCloudflareContext } from '@opennextjs/cloudflare';

import { isCloudflareWorker } from './env';

type HyperdriveBinding = {
  connectionString?: string;
};

export type CloudflareRuntimeEnv = {
  HYPERDRIVE?: HyperdriveBinding;
} & Record<string, unknown>;

let hasWarnedAboutCloudflareContextFailure = false;

export function getOptionalCloudflareRuntimeEnv(): CloudflareRuntimeEnv | null {
  if (!isCloudflareWorker) {
    return null;
  }

  try {
    const { env } = getCloudflareContext();
    return (env ?? null) as CloudflareRuntimeEnv | null;
  } catch (error) {
    if (!hasWarnedAboutCloudflareContextFailure) {
      hasWarnedAboutCloudflareContextFailure = true;
      console.warn('[cloudflare] failed to resolve worker runtime env', error);
    }

    return null;
  }
}
