const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_OURA_DATE = "2015-01-01";

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isValidIsoCalendarDate(date: string): boolean {
  const match = DATE_PATTERN.exec(date);
  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function validateDate(
  date: string | undefined,
  fieldName: string,
  now: Date = new Date()
): string | undefined | Error {
  if (!date) {
    return undefined;
  }

  if (!DATE_PATTERN.test(date)) {
    return new Error(`Invalid ${fieldName}: Date must be in YYYY-MM-DD format`);
  }

  if (!isValidIsoCalendarDate(date)) {
    return new Error(`Invalid ${fieldName}: Invalid calendar date`);
  }

  if (date > getDefaultEndDate(now)) {
    return new Error(`Invalid ${fieldName}: Date cannot be in the future`);
  }

  if (date < MIN_OURA_DATE) {
    return new Error(`Invalid ${fieldName}: Date must be after 2015-01-01`);
  }

  return date;
}

export function validateDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  now: Date = new Date()
): { start: string; end: string } | Error {
  const startResult = validateDate(startDate, "start_date", now);
  if (startResult instanceof Error) {
    return startResult;
  }

  const endResult = validateDate(endDate, "end_date", now);
  if (endResult instanceof Error) {
    return endResult;
  }

  if (startResult && endResult && startResult > endResult) {
    return new Error("start_date cannot be after end_date");
  }

  return {
    start: startResult ?? getDefaultStartDate(now),
    end: endResult ?? getDefaultEndDate(now),
  };
}

export function getDefaultStartDate(now: Date = new Date()): string {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - 7);
  return toIsoDate(date);
}

export function getDefaultEndDate(now: Date = new Date()): string {
  return toIsoDate(now);
}
