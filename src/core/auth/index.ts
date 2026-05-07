import { betterAuth } from 'better-auth';

import { getAllConfigs } from '@/shared/models/config';

import { getAuthOptions } from './config';
import { resolveRequestOrigin } from './runtime';

// get auth instance in server side
export async function getAuth(request?: Request) {
  // get configs from db and env
  const configs = await getAllConfigs();

  const authOptions = await getAuthOptions(configs, {
    requestOrigin: request
      ? resolveRequestOrigin({
          originHeader: request.headers.get('origin'),
          refererHeader: request.headers.get('referer'),
          requestURL: request.url,
        })
      : undefined,
  });

  return betterAuth(authOptions);
}
