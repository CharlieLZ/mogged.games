import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { rateLimit } from '@/shared/lib/api/rate-limit';
import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { createUploadClaimToken } from '@/shared/lib/storage-upload-claim';
import {
  ALL_ALLOWED_UPLOAD_MIME_TYPES,
  getMaxUploadSize,
  getUploadCategory,
} from '@/shared/lib/upload-validation';
import { getStorageService } from '@/shared/services/storage';

const presignLimiter = rateLimit({
  uniqueTokenPerInterval: 20,
  interval: 60 * 1000,
});

const presignRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().positive(),
});

function sanitizeFilename(fileName: string) {
  return fileName
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

function buildStorageKey(fileName: string, category: string) {
  const extension =
    fileName.includes('.') && fileName.split('.').pop()
      ? `.${fileName.split('.').pop()!.replace(/[^\w]/g, '').toLowerCase()}`
      : '';

  return `uploads/${category}/${Date.now()}-${randomUUID()}${extension}`;
}

const routeHandlers = createSecureJsonPostRoute({
  actionName: 'storage-presign-post',
  schema: presignRequestSchema,
  parseErrorMessage: 'Invalid request payload',
  unauthorizedMessage: 'Unauthorized',
  rateLimit: {
    limiter: presignLimiter,
    keyPrefix: 'storage-presign',
    message: 'Too many upload requests',
  },
  async handler({ user, body }) {
    try {
      const { fileName, mimeType, fileSize } = body;
      if (
        !ALL_ALLOWED_UPLOAD_MIME_TYPES.includes(
          mimeType as (typeof ALL_ALLOWED_UPLOAD_MIME_TYPES)[number]
        )
      ) {
        return Response.json(
          {
            code: -1,
            message: 'File type not supported',
          },
          { status: 400 }
        );
      }

      const maxAllowedSize = getMaxUploadSize(mimeType);
      if (!maxAllowedSize || fileSize > maxAllowedSize) {
        return Response.json(
          {
            code: -1,
            message: 'Invalid file size',
          },
          { status: 400 }
        );
      }

      const category = getUploadCategory(mimeType);
      if (!category) {
        return Response.json(
          {
            code: -1,
            message: 'File type not supported',
          },
          { status: 400 }
        );
      }

      const sanitizedFileName = sanitizeFilename(fileName);
      const key = buildStorageKey(sanitizedFileName, category);

      const storageService = await getStorageService();
      const signedUpload = await storageService.createSignedUploadRequest({
        key,
        contentType: mimeType,
        disposition: 'inline',
      });

      const { token, claim } = createUploadClaimToken({
        userId: user.id,
        key: signedUpload.key,
        mimeType,
        fileSize,
        fileName: sanitizedFileName,
      });

      return Response.json({
        code: 0,
        message: 'ok',
        data: {
          key: signedUpload.key,
          fileName: sanitizedFileName,
          uploadUrl: signedUpload.uploadUrl,
          uploadHeaders: signedUpload.uploadHeaders || {},
          verifyToken: token,
          expiresAt: new Date(claim.exp * 1000).toISOString(),
          expected: {
            mimeType,
            fileSize,
          },
        },
      });
    } catch (error) {
      console.error('Failed to create upload signature', error);
      return Response.json(
        {
          code: -1,
          message: 'Failed to create upload signature',
        },
        { status: 500 }
      );
    }
  },
});

export const { OPTIONS, POST } = routeHandlers;
