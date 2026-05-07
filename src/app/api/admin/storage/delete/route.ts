import { z } from 'zod';

import { PERMISSIONS } from '@/core/rbac/permission';
import { rateLimit } from '@/shared/lib/api/rate-limit';
import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { hasPermission } from '@/shared/services/rbac';
import { getStorageService } from '@/shared/services/storage';

const deleteLimiter = rateLimit({
  uniqueTokenPerInterval: 20,
  interval: 60 * 1000,
});

const deleteStorageSchema = z
  .object({
    key: z.string().trim().min(1).optional(),
    url: z.string().trim().url().optional(),
  })
  .refine((value) => Boolean(value.key || value.url), {
    message: 'key or url is required',
  });

function resolveDeleteKey(options: {
  key?: string;
  url?: string;
  publicDomain?: string;
}) {
  if (options.key) {
    return options.key;
  }

  const normalizedDomain = options.publicDomain?.replace(/\/$/, '');
  if (
    options.url &&
    normalizedDomain &&
    options.url.startsWith(normalizedDomain)
  ) {
    return options.url.substring(normalizedDomain.length + 1);
  }

  return null;
}

const routeHandlers = createSecureJsonPostRoute({
  actionName: 'admin-storage-delete-post',
  schema: deleteStorageSchema,
  parseErrorMessage: 'key or url is required',
  unauthorizedMessage: 'Unauthorized',
  unauthorizedStatus: 401,
  rateLimit: {
    limiter: deleteLimiter,
    keyPrefix: 'admin-storage-delete',
    message: 'too many delete requests',
  },
  authorize: async ({ user }) => {
    const admin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    return admin ? null : respErrWithStatus('Forbidden', 403);
  },
  async handler({ user, body }) {
    try {
      const storageService = await getStorageService();
      const provider = storageService.getProvider('r2');
      const publicDomain = (provider?.configs as { publicDomain?: string })
        ?.publicDomain;
      const deleteKey = resolveDeleteKey({
        key: body.key,
        url: body.url,
        publicDomain,
      });

      if (!deleteKey) {
        return respErrWithStatus('key or url is required', 400);
      }

      const result = await storageService.deleteFile(deleteKey);

      if (!result.success) {
        return respErrWithStatus(result.error || 'Delete failed', 500);
      }

      return respData({ deleted: deleteKey });
    } catch (error) {
      console.error('[admin/storage/delete] failed', {
        userId: user.id,
        key: body.key,
        url: body.url,
        error,
      });
      return respErrWithStatus('delete failed', 500);
    }
  },
});

export const { OPTIONS, POST } = routeHandlers;
