import { SeedanceProviderName } from './types';

export function buildSeedanceCallbackUrl(input: {
  appUrl?: string | null;
  provider: SeedanceProviderName;
}) {
  const normalizedAppUrl = input.appUrl?.trim().replace(/\/+$/, '');
  if (!normalizedAppUrl) {
    return undefined;
  }

  return `${normalizedAppUrl}/api/ai/notify/${input.provider}`;
}
