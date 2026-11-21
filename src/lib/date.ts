/**
 * Date helpers. Dates travel through the app as `YYYYMMDD` strings and are
 * turned into `Date` objects at local midnight, so formatting them in the
 * runtime's local zone always yields the intended calendar day.
 *
 * "Today" is always the calendar day in the schools' time zone. The server
 * runs in UTC (node:20-alpine sets no TZ), where midnight to 1–2 am German time
 * would otherwise still be "yesterday".
 */

export const SCHOOL_TIME_ZONE = 'Europe/Berlin';

/** From this hour (school time) on, the app opens on the next school day. */
export const NEXT_DAY_CUTOFF_HOUR = 16;

export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function parseDateStr(dateStr: string): Date {
  const y = parseInt(dateStr.slice(0, 4), 10);
  const m = parseInt(dateStr.slice(4, 6), 10) - 1;
  const d = parseInt(dateStr.slice(6, 8), 10);
  return new Date(y, m, d);
}

const DATE_STR_RE = /^\d{8}$/;

/** True for a real calendar date in `YYYYMMDD` form (rejects e.g. `20260231`). */
export function isValidDateStr(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_STR_RE.test(value)) return false;
  return formatDateStr(parseDateStr(value)) === value;
}

const GERMAN_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/;

export function parseGermanDateStr(input: string): string | null {
  const match = GERMAN_DATE_RE.exec(input.trim());
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);
  if (match[3].length === 2) year += 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return formatDateStr(date);
}

const schoolClockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SCHOOL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

/** The calendar day (as a local-midnight `Date`) and hour in the schools' time zone. */
export function getSchoolClock(now: Date = new Date()): { date: Date; hour: number } {
  const parts: Record<string, string> = {};
  for (const part of schoolClockFormatter.formatToParts(now)) parts[part.type] = part.value;

  return {
    date: new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
    hour: Number(parts.hour),
  };
}

export function getTodayStr(now?: Date): string {
  return formatDateStr(getSchoolClock(now).date);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isWeekendDate(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function nextSchoolDay(date: Date): Date {
  let next = addDays(date, 1);
  while (isWeekendDate(next)) next = addDays(next, 1);
  return next;
}

export function previousSchoolDay(date: Date): Date {
  let prev = addDays(date, -1);
  while (isWeekendDate(prev)) prev = addDays(prev, -1);
  return prev;
}

/** Moves `offset` school days (Mon–Fri) forwards or backwards. */
export function shiftSchoolDay(dateStr: string, offset: number): string {
  let date = parseDateStr(dateStr);
  for (let i = 0; i < Math.abs(offset); i++) {
    date = offset > 0 ? nextSchoolDay(date) : previousSchoolDay(date);
  }
  return formatDateStr(date);
}

/**
 * The day the app opens on: today, or the next school day on weekends and
 * once school is over (from NEXT_DAY_CUTOFF_HOUR), when students check tomorrow.
 */
export function getDefaultDateStr(now?: Date): string {
  const { date, hour } = getSchoolClock(now);
  if (isWeekendDate(date) || hour >= NEXT_DAY_CUTOFF_HOUR) {
    return formatDateStr(nextSchoolDay(date));
  }
  return formatDateStr(date);
}

/** Monday of the calendar week (Sunday belongs to the week before). */
export function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

export function getWeekDates(anchorDate: Date): Date[] {
  const start = getWeekStart(anchorDate);
  return Array.from({ length: 5 }, (_, index) => addDays(start, index));
}

/** Monday of the school week a date belongs to; weekends look ahead to the coming week. */
export function getSchoolWeekStart(date: Date): Date {
  return getWeekStart(isWeekendDate(date) ? nextSchoolDay(date) : date);
}

export function getSchoolWeekDates(anchorDate: Date): Date[] {
  const start = getSchoolWeekStart(anchorDate);
  return Array.from({ length: 5 }, (_, index) => addDays(start, index));
}

const dayLabelFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export function formatDayLabel(date: Date): string {
  return dayLabelFormatter.format(date);
}

const weekdayFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'long' });
const dayMonthFormatter = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' });
const dayMonthYearFormatter = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatWeekday(date: Date): string {
  return weekdayFormatter.format(date);
}

/** `12.11.` */
export function formatShortDate(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

/** `8.–12. Juni 2026`, `29. Juni – 3. Juli 2026` or `29. Dezember 2025 – 2. Januar 2026`. */
export function formatWeekLabel(startDate: Date, endDate: Date): string {
  if (startDate.getFullYear() !== endDate.getFullYear()) {
    return `${dayMonthYearFormatter.format(startDate)} – ${dayMonthYearFormatter.format(endDate)}`;
  }
  if (startDate.getMonth() !== endDate.getMonth()) {
    return `${dayMonthFormatter.format(startDate)} – ${dayMonthYearFormatter.format(endDate)}`;
  }
  return `${startDate.getDate()}.–${dayMonthYearFormatter.format(endDate)}`;
}

const TIMESTAMP_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4}),?\s+(\d{1,2}):(\d{2})/;

/**
 * Turns the plan's `zeitstempel` (`12.11.2026, 07:12`) into `Stand: heute, 07:12`
 * or `Stand: 11.11., 15:30`. Unknown formats are shown as they are.
 */
export function formatUpdatedAt(raw: string | undefined, todayStr: string): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const match = TIMESTAMP_RE.exec(value);
  if (!match) return `Stand: ${value}`;

  const [, day, month, year, hour, minute] = match;
  const time = `${hour.padStart(2, '0')}:${minute}`;
  const stampStr = `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
  if (stampStr === todayStr) return `Stand: heute, ${time}`;
  return `Stand: ${Number(day)}.${Number(month)}., ${time}`;
}
