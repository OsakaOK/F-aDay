export const MS_PER_DAY = 86_400_000;

/**
 * Whole UTC days since the Unix epoch. This is the day index that drives the
 * shared daily puzzle — the boundary is UTC midnight for everyone. Clients
 * convert the countdown to their own timezone for display only.
 *
 * Dev-only: FADAY_DAY_OVERRIDE forces a specific day index (e.g. to exercise a
 * future cycle's community hint pool). Ignored in production.
 */
export function daysSinceEpoch(now: number = Date.now()): number {
  if (process.env.NODE_ENV !== "production" && process.env.FADAY_DAY_OVERRIDE) {
    const override = Number(process.env.FADAY_DAY_OVERRIDE);
    if (Number.isFinite(override)) return Math.floor(override);
  }
  return Math.floor(now / MS_PER_DAY);
}

/** Epoch-ms timestamp of the next UTC midnight after `now`. */
export function nextUtcMidnight(now: number = Date.now()): number {
  return (daysSinceEpoch(now) + 1) * MS_PER_DAY;
}

/**
 * The calendar date for a given puzzle day index, e.g. "21 July 2026". Pinned to
 * UTC + a fixed locale so server and client render identically (no hydration
 * mismatch) and it lines up with the UTC-midnight puzzle boundary.
 */
export function formatPuzzleDate(dayIndex: number): string {
  return new Date(dayIndex * MS_PER_DAY).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
