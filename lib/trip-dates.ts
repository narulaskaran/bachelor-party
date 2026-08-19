export const END_BEFORE_START_MESSAGE = "End date can’t be before start date";
export const INVALID_CALENDAR_DATE_MESSAGE = "Enter a valid calendar date (YYYY-MM-DD)";

/** True only for a real proleptic Gregorian calendar date in YYYY-MM-DD form. */
export function isValidCalendarDate(value?: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day <= daysInMonth;
}

/** True when both valid dates are set and end is strictly before start. */
export function isInvertedDateRange(
  startDate?: string,
  endDate?: string,
): boolean {
  const start = startDate?.trim();
  const end = endDate?.trim();
  return Boolean(start && end && end < start);
}
