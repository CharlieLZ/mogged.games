export const GUEST_DAILY_QUOTA_LIMIT = 100;
export const GUEST_DAILY_IP_LIMIT = 300;
export const PROMO_BANNER_SEEN_STORAGE_KEY = 'image-editor-ai:promo-banner:v3';
export const PROMO_BANNER_POPOVER_DURATION_MS = 5000;

export type GuestDailyQuotaStatus = {
  dateKey: string;
  limit: number;
  used: number;
  reserved: number;
  remaining: number;
};

export function formatGuestQuotaDateKey(date = new Date()) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function createDefaultGuestQuotaStatus(
  date = new Date()
): GuestDailyQuotaStatus {
  return {
    dateKey: formatGuestQuotaDateKey(date),
    limit: GUEST_DAILY_QUOTA_LIMIT,
    used: 0,
    reserved: 0,
    remaining: GUEST_DAILY_QUOTA_LIMIT,
  };
}

export function getGuestQuotaResetAt(date = new Date()) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
}
