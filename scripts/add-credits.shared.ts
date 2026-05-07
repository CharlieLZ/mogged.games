export function calculateManualCreditExpiration(date = new Date()) {
  const expiresAt = new Date(date);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return expiresAt;
}
