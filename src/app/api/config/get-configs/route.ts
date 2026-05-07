import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { getPublicConfigs } from '@/shared/models/config';

async function readPublicConfigs() {
  try {
    const configs = await getPublicConfigs();

    return respData(configs);
  } catch (error: unknown) {
    console.error('[config/get-configs] failed', error);
    const message =
      error instanceof Error ? error.message : 'get configs failed';
    return respErrWithStatus(message, 500);
  }
}

export async function GET() {
  return readPublicConfigs();
}
