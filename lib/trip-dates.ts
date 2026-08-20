export const END_BEFORE_START_MESSAGE = "End date can’t be before start date";
export const INVALID_CALENDAR_DATE_MESSAGE = "Enter a valid calendar date (YYYY-MM-DD)";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

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

export function optionalDate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Human date label from optional YYYY-MM-DD fields (UTC, so the picker day sticks). */
export function formatDateLabel(
  startDate?: string,
  endDate?: string,
): string | undefined {
  const start = optionalDate(startDate);
  const end = optionalDate(endDate);
  if (!start && !end) return undefined;
  const fmt = (iso: string) => {
    const match = ISO_DATE.exec(iso);
    if (!match) return iso;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  if (start && end && start !== end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start ?? end ?? "");
}
