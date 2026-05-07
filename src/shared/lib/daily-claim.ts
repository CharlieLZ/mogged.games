export const DEFAULT_DAILY_CLAIM_CREDITS_AMOUNT = 5;
export const DEFAULT_DAILY_CLAIM_VALID_DAYS = 7;

export function parseDailyClaimCreditsAmount(value?: string | null) {
  const parsedAmount = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsedAmount) && parsedAmount > 0
    ? parsedAmount
    : DEFAULT_DAILY_CLAIM_CREDITS_AMOUNT;
}

export function parseDailyClaimValidDays(value?: string | null) {
  const parsedDays = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsedDays) && parsedDays > 0
    ? parsedDays
    : DEFAULT_DAILY_CLAIM_VALID_DAYS;
}

function padDatePart(value: number) {
  return value.toString().padStart(2, '0');
}

export function formatDailyClaimDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-');
}

export function getDailyClaimWindow(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start,
    end,
    dateKey: formatDailyClaimDateKey(start),
  };
}

export function calculateDailyClaimExpirationTime({
  date = new Date(),
  validDays = DEFAULT_DAILY_CLAIM_VALID_DAYS,
}: {
  date?: Date;
  validDays?: number;
} = {}) {
  const expiresAt = new Date(date);
  expiresAt.setDate(expiresAt.getDate() + validDays);

  return expiresAt;
}

export function buildDailyClaimTransactionNo(
  userId: string,
  date = new Date()
) {
  return `daily_claim:${formatDailyClaimDateKey(date)}:${userId}`;
}
