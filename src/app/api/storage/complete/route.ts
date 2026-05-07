import { z } from 'zod';

import { rateLimit } from '@/shared/lib/api/rate-limit';
import { createSecureJsonPostRoute } from '@/shared/lib/api/secure-json-route';
import { verifyUploadClaimToken } from '@/shared/lib/storage-upload-claim';
import { validateFileSignature } from '@/shared/lib/upload-validation';
import { getAllConfigs } from '@/shared/models/config';
import { getStorageService } from '@/shared/services/storage';

const completeLimiter = rateLimit({
  uniqueTokenPerInterval: 40,
  interval: 60 * 1000,
});

const completeRequestSchema = z.object({
  key: z.string().trim().min(1),
  verifyToken: z.string().trim().min(1),
});

const SIGNATURE_SAMPLE_BYTES = 512;

async function safeDeleteObject(key: string) {
  try {
    const storageService = await getStorageService();
    await storageService.deleteFile(key);
  } catch (error) {
    console.warn('Failed to cleanup invalid upload object', error);
  }
}

async function resolvePublicUrl(key: string) {
  const configs = await getAllConfigs();

  if (configs.r2_domain) {
    return `${configs.r2_domain.replace(/\/$/, '')}/${key}`;
  }

  if (configs.s3_domain) {
    return `${configs.s3_domain.replace(/\/$/, '')}/${key}`;
  }

  return `${configs.app_url}/api/storage/file?key=${encodeURIComponent(key)}`;
}

const completeRouteHandlers = createSecureJsonPostRoute({
  actionName: 'storage-complete-post',
  schema: completeRequestSchema,
  parseErrorMessage: 'Invalid request payload',
  unauthorizedMessage: 'Unauthorized',
  rateLimit: {
    limiter: completeLimiter,
    keyPrefix: 'storage-complete',
    message: 'Too many upload requests',
  },
  async handler({ user, body }) {
    try {
      const { key, verifyToken } = body;
      const claim = verifyUploadClaimToken(verifyToken);
      if (!claim) {
        return Response.json(
          {
            code: -1,
            message: 'Upload verification token is invalid or expired',
          },
          { status: 400 }
        );
      }

      if (claim.uid !== user.id) {
        return Response.json(
          {
            code: -1,
            message:
              'Upload verification token does not belong to current user',
          },
          { status: 403 }
        );
      }

      if (claim.key !== key) {
        return Response.json(
          {
            code: -1,
            message: 'Upload key does not match verification token',
          },
          { status: 400 }
        );
      }

      const storageService = await getStorageService();
      const metadata = await storageService.getObjectMetadata(key);
      if (metadata.size <= 0 || metadata.size !== claim.size) {
        await safeDeleteObject(key);
        return Response.json(
          {
            code: -1,
            message: 'Uploaded object size mismatch',
          },
          { status: 400 }
        );
      }

      const sampleResult = await storageService.getObjectSample({
        key,
        bytes: SIGNATURE_SAMPLE_BYTES,
      });
      if (
        !sampleResult.sample.length ||
        !validateFileSignature(sampleResult.sample, claim.mime)
      ) {
        await safeDeleteObject(key);
        return Response.json(
          {
            code: -1,
            message: 'Uploaded object content does not match declared type',
          },
          { status: 400 }
        );
      }

      if (sampleResult.contentType && sampleResult.contentType !== claim.mime) {
        await safeDeleteObject(key);
        return Response.json(
          {
            code: -1,
            message: 'Uploaded object MIME type mismatch',
          },
          { status: 400 }
        );
      }

      return Response.json({
        code: 0,
        message: 'ok',
        data: {
          key,
          url: await resolvePublicUrl(key),
          mimeType: claim.mime,
          fileSize: metadata.size,
        },
      });
    } catch (error) {
      console.error('Failed to verify upload', error);
      return Response.json(
        {
          code: -1,
          message: 'Failed to verify upload',
        },
        { status: 500 }
      );
    }
  },
});

export const { OPTIONS, POST } = completeRouteHandlers;
