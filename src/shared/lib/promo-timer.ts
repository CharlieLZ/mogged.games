// Promo timer utilities to persist countdown across page refreshes

const PROMO_STORAGE_KEY = 'promo_end_time';
const PROMO_DURATION_MS = (6 * 60 * 60 + 42 * 60 + 35) * 1000; // 6:42:35

export function getPromoEndTime(): Date {
  if (typeof window === 'undefined') {
    // Server-side: return a date far in the future
    return new Date(Date.now() + PROMO_DURATION_MS);
  }

  // Client-side: check localStorage
  const stored = localStorage.getItem(PROMO_STORAGE_KEY);

  if (stored) {
    const endTime = new Date(stored);
    // If the stored time hasn't expired, use it
    if (endTime.getTime() > Date.now()) {
      return endTime;
    }
  }

  // Create new end time
  const newEndTime = new Date(Date.now() + PROMO_DURATION_MS);
  localStorage.setItem(PROMO_STORAGE_KEY, newEndTime.toISOString());

  return newEndTime;
}

export function resetPromoEndTime(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PROMO_STORAGE_KEY);
  }
}
