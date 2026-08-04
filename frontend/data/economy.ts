// Mirrors backend/bethany_mock/account_repository.py's periodic Beths income constants.
export const BETH_INCOME_INTERVAL_SECONDS = 300; // 5 Beths every 5 minutes
export const BETH_INCOME_AMOUNT = 5;

// Seconds remaining until the account's next passive Beth, given the ISO timestamp of its
// last grant (empty string means no grant has ever been recorded, e.g. a fresh account).
export function secondsUntilNextBeth(lastGrantAt: string): number {
  if (!lastGrantAt) return BETH_INCOME_INTERVAL_SECONDS;
  const lastMs = new Date(lastGrantAt).getTime();
  if (!Number.isFinite(lastMs)) return BETH_INCOME_INTERVAL_SECONDS;
  const elapsedSeconds = Math.floor((Date.now() - lastMs) / 1000);
  const remainder = ((elapsedSeconds % BETH_INCOME_INTERVAL_SECONDS) + BETH_INCOME_INTERVAL_SECONDS) % BETH_INCOME_INTERVAL_SECONDS;
  return BETH_INCOME_INTERVAL_SECONDS - remainder;
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
