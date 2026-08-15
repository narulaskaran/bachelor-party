export const END_BEFORE_START_MESSAGE = "End date can’t be before start date";

/** True when both dates are set and end is strictly before start (ISO YYYY-MM-DD). */
export function isInvertedDateRange(
  startDate?: string,
  endDate?: string,
): boolean {
  const start = startDate?.trim();
  const end = endDate?.trim();
  return Boolean(start && end && end < start);
}
