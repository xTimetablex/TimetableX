export type ViewMode = 'day' | 'week';

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

export function getTodayStr(): string {
  return formatDateStr(new Date());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

export function getWeekDates(anchorDate: Date): Date[] {
  const start = getWeekStart(anchorDate);
  return Array.from({ length: 5 }, (_, index) => addDays(start, index));
}

export function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatWeekLabel(startDate: Date, endDate: Date): string {
  const start = `${startDate.getDate()}.${startDate.getMonth() + 1}`;
  const end = `${endDate.getDate()}.${endDate.getMonth() + 1}`;
  return `Woche vom ${start} - ${end}`;
}
