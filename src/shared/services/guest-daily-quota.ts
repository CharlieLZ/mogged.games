import 'server-only';

import { resolveCreditRegionPolicy } from '@/shared/lib/credit-region-policy';
import { GUEST_DAILY_QUOTA_LIMIT } from '@/shared/lib/viewer-quota';
import {
  consumeGuestQuotaReservation,
  releaseGuestQuotaReservation,
  reserveGuestQuota,
} from '@/shared/models/guest_daily_quota';

import type { GuestViewer } from './guest-viewer';

export class GuestQuotaGeoExceededError extends Error {
  constructor() {
    super('guest image generation is not available in your region');
    this.name = 'GuestQuotaGeoExceededError';
  }
}

export function reserveGuestDailyQuota(viewer: GuestViewer, units = 1) {
  const policy = resolveCreditRegionPolicy({
    countryCode: viewer.countryCode,
    guestQuotaCredits: GUEST_DAILY_QUOTA_LIMIT,
  });
  if (!policy.guestGenerationEnabled) {
    throw new GuestQuotaGeoExceededError();
  }

  return reserveGuestQuota(viewer, units);
}

export function consumeGuestDailyQuotaReservation(
  viewer: GuestViewer,
  dateKey: string,
  units = 1
) {
  return consumeGuestQuotaReservation(viewer, dateKey, units);
}

export function releaseGuestDailyQuotaReservation(
  viewer: GuestViewer,
  dateKey: string,
  units = 1
) {
  return releaseGuestQuotaReservation(viewer, dateKey, units);
}
