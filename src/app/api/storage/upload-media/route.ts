import { v4 as uuidv4 } from 'uuid';

import { getClientIpFromHeaders, rateLimit } from '@/shared/lib/api/rate-limit';
import {
  createApiPreflightResponse,
  enforceApiWriteSecurity,
} from '@/shared/lib/api/request-security';
import { respData, respErr } from '@/shared/lib/resp';
import {
  ALL_ALLOWED_UPLOAD_MIME_TYPES,
  getMaxUploadSize,
} from '@/shared/lib/upload-validation';
import { formatGuestQuotaDateKey } from '@/shared/lib/viewer-quota';
import { resolveRequestViewer } from '@/shared/services/guest-viewer';
import { getStorageService } from '@/shared/services/storage';

const uploadMediaLimiter = rateLimit({
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
      'storage-upload-media-post'
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

    const rate = await uploadMediaLimiter(
      `storage-upload-media:${getClientIpFromHeaders(req.headers)}:${user.id}`
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

    const MAX_FILES = user.isGuest ? 1 : 5;
    if (files.length > MAX_FILES) {
      return respErr(`Too many files. Max ${MAX_FILES} files allowed.`);
    }

    const uploadResults: {
      url: string;
      key: string;
      filename: string;
    }[] = [];

    for (const file of files) {
      if (
        !ALL_ALLOWED_UPLOAD_MIME_TYPES.includes(
          file.type as (typeof ALL_ALLOWED_UPLOAD_MIME_TYPES)[number]
        )
      ) {
        return respErr(`File ${file.name} is not an allowed media type.`);
      }

      const maxSize = getMaxUploadSize(file.type) || 0;
      const effectiveMaxSize = user.isGuest
        ? Math.min(maxSize, 20 * 1024 * 1024)
        : maxSize;
      if (file.size > effectiveMaxSize) {
        return respErr(
          `File ${file.name} exceeds size limit of ${Math.floor(effectiveMaxSize / 1024 / 1024)}MB`
        );
      }

      const extFromName = file.name.includes('.')
        ? file.name.split('.').pop() || ''
        : '';
      const extFromType = file.type.split('/')[1] || '';
      const ext = (extFromName || extFromType || 'bin').replace(
        /[^a-zA-Z0-9]/g,
        ''
      );
      const key = user.isGuest
        ? `uploads/guest/${formatGuestQuotaDateKey()}/${user.guestIdHash}/${Date.now()}-${uuidv4()}.${ext || 'bin'}`
        : `uploads/${Date.now()}-${uuidv4()}.${ext || 'bin'}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const storageService = await getStorageService();

      const result = await storageService.uploadFile({
        body: buffer,
        key,
        contentType: file.type,
        disposition: 'inline',
      });

      if (!result.success) {
        console.error('[API] Upload media failed:', result.error);
        return respErr(result.error || 'Upload failed');
      }

      uploadResults.push({
        url: result.url || '',
        key: result.key || '',
        filename: file.name,
      });
    }

    return respData({
      urls: uploadResults.map((item) => item.url),
      results: uploadResults,
    });
  } catch (error) {
    console.error('upload media failed:', error);
    return respErr('upload media failed');
  }
}
