import { v4 as uuidv4 } from 'uuid';

import { getClientIpFromHeaders, rateLimit } from '@/shared/lib/api/rate-limit';
import {
  createApiPreflightResponse,
  enforceApiWriteSecurity,
} from '@/shared/lib/api/request-security';
import { respData, respErr } from '@/shared/lib/resp';
import {
  getMaxUploadSize,
  IMAGE_MIME_TYPES,
} from '@/shared/lib/upload-validation';
import { formatGuestQuotaDateKey } from '@/shared/lib/viewer-quota';
import { resolveRequestViewer } from '@/shared/services/guest-viewer';
import { getStorageService } from '@/shared/services/storage';

const uploadImageLimiter = rateLimit({
  uniqueTokenPerInterval: 10,
  interval: 60 * 1000,
});

export async function OPTIONS() {
  return createApiPreflightResponse();
}

export async function POST(req: Request) {
  try {
    const securityResponse = await enforceApiWriteSecurity(
      req,
      'storage-upload-image-post'
    );
    if (securityResponse) {
      return securityResponse;
    }

    const user = await resolveRequestViewer({ allowGuest: true, request: req });
    if (!user) {
      return Response.json(
        {
          code: -1,
          message: 'no auth, please sign in',
        },
        { status: 401 }
      );
    }

    const rate = await uploadImageLimiter(
      `storage-upload-image:${getClientIpFromHeaders(req.headers)}:${user.id}`
    );
    if (!rate.success) {
      return Response.json(
        {
          code: -1,
          message: 'too many upload requests',
        },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return respErr('No files provided');
    }

    const MAX_FILES = user.isGuest ? 1 : 10;

    if (files.length > MAX_FILES) {
      return respErr(`Too many files. Max ${MAX_FILES} images allowed.`);
    }

    const uploadResults: {
      url: string;
      key: string;
      filename: string;
    }[] = [];

    for (const file of files) {
      // Validate file type
      if (
        !IMAGE_MIME_TYPES.includes(
          file.type as (typeof IMAGE_MIME_TYPES)[number]
        )
      ) {
        return respErr(
          `File ${file.name} is not an allowed image type (${IMAGE_MIME_TYPES.join(', ')})`
        );
      }

      const maxSize = getMaxUploadSize(file.type) || 0;
      if (file.size > maxSize) {
        return respErr(
          `File ${file.name} exceeds size limit of ${Math.floor(maxSize / 1024 / 1024)}MB`
        );
      }

      // Generate unique key
      const extFromName = file.name.includes('.')
        ? file.name.split('.').pop() || ''
        : '';
      const extFromType = file.type.split('/')[1] || '';
      const ext = (extFromName || extFromType || 'img').replace(
        /[^a-zA-Z0-9]/g,
        ''
      );
      const key = user.isGuest
        ? `uploads/guest/${formatGuestQuotaDateKey()}/${user.guestIdHash}/${Date.now()}-${uuidv4()}.${ext || 'img'}`
        : `uploads/${Date.now()}-${uuidv4()}.${ext || 'img'}`;

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const storageService = await getStorageService();

      // Upload to storage
      const result = await storageService.uploadFile({
        body: buffer,
        key: key,
        contentType: file.type,
        disposition: 'inline',
      });

      if (!result.success) {
        console.error('[API] Upload failed:', result.error);
        return respErr(result.error || 'Upload failed');
      }

      console.log('[API] Upload success:', result.url);

      uploadResults.push({
        url: result.url || '',
        key: result.key || '',
        filename: file.name,
      });
    }

    console.log(
      '[API] All uploads complete. Returning URLs:',
      uploadResults.map((r) => r.url)
    );

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e) {
    console.error('upload image failed:', e);
    return respErr('upload image failed');
  }
}
