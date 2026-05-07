import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { getRequestViewerInfo } from '@/shared/services/guest-viewer';

export async function GET() {
  try {
    const viewer = await getRequestViewerInfo();
    if (!viewer) {
      return respErrWithStatus('viewer info unavailable', 503, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    const response = respData(viewer);
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate'
    );

    return response;
  } catch (error) {
    console.error('[user/get-viewer-info] failed', {
      error,
      step: 'get-request-viewer-info',
    });
    return respErrWithStatus('get viewer info failed', 500, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}
