import { respData, respErrWithStatus } from '@/shared/lib/resp';
import { getRequestViewerInfo } from '@/shared/services/guest-viewer';

export async function GET() {
  try {
    const viewer = await getRequestViewerInfo();
    if (!viewer) {
      return respErrWithStatus('guest quota unavailable', 503);
    }

    return respData({
      isGuest: viewer.isGuest,
      guestQuota: viewer.guestQuota,
      credits: viewer.credits,
    });
  } catch (error) {
    console.error('[guest/quota] failed', { error });
    return respErrWithStatus('guest quota failed', 500);
  }
}
