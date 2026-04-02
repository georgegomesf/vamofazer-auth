
/**
 * Returns the current date shifted to match the local wall-clock time as if it were UTC.
 * This is used to maintain consistency with the database pattern where "visual time" is stored as UTC.
 */
export function getWallClockNow(): Date {
  const now = new Date();
  const brOffset = 3 * 60 * 60 * 1000; // Force 3h shift for Brazil
  return new Date(now.getTime() - brOffset);
}

/**
 * Shifts a given date by the visual offset.
 */
export function toWallClock(date: Date): Date {
  const brOffset = 3 * 60 * 60 * 1000;
  return new Date(date.getTime() - brOffset);
}
