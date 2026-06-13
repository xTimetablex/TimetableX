import { describe, it, expect } from 'vitest';
import {
  formatDateStr,
  parseDateStr,
  parseGermanDateStr,
  addDays,
  getWeekStart,
  getWeekDates,
  formatWeekLabel,
  getTodayStr,
  formatDayLabel,
} from '../date';

describe('formatDateStr', () => {
  it('formats a date as YYYYMMDD', () => {
    expect(formatDateStr(new Date(2024, 0, 5))).toBe('20240105');
  });

  it('zero-pads month and day', () => {
    expect(formatDateStr(new Date(2024, 8, 3))).toBe('20240903');
  });

  it('handles December 31', () => {
    expect(formatDateStr(new Date(2024, 11, 31))).toBe('20241231');
  });
});

describe('parseDateStr', () => {
  it('parses YYYYMMDD back to a Date', () => {
    const d = parseDateStr('20240105');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(5);
  });

  it('roundtrips with formatDateStr', () => {
    const original = '20260609';
    expect(formatDateStr(parseDateStr(original))).toBe(original);
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    const d = new Date(2024, 0, 5);
    expect(addDays(d, 3).getDate()).toBe(8);
  });

  it('subtracts days when negative', () => {
    const d = new Date(2024, 0, 5);
    expect(addDays(d, -4).getDate()).toBe(1);
  });

  it('crosses month boundaries', () => {
    const d = new Date(2024, 0, 31);
    const next = addDays(d, 1);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(1);
  });

  it('does not mutate the original date', () => {
    const d = new Date(2024, 0, 5);
    addDays(d, 10);
    expect(d.getDate()).toBe(5);
  });
});

describe('getWeekStart', () => {
  it('returns same day for Monday', () => {
    const monday = new Date(2026, 5, 8); // Monday 2026-06-08
    const start = getWeekStart(monday);
    expect(formatDateStr(start)).toBe('20260608');
  });

  it('returns previous Monday for Wednesday', () => {
    const wednesday = new Date(2026, 5, 10); // Wednesday 2026-06-10
    const start = getWeekStart(wednesday);
    expect(formatDateStr(start)).toBe('20260608');
  });

  it('returns previous Monday for Sunday', () => {
    const sunday = new Date(2026, 5, 14); // Sunday 2026-06-14
    const start = getWeekStart(sunday);
    expect(formatDateStr(start)).toBe('20260608');
  });

  it('returns previous Monday for Friday', () => {
    const friday = new Date(2026, 5, 12); // Friday 2026-06-12
    const start = getWeekStart(friday);
    expect(formatDateStr(start)).toBe('20260608');
  });
});

describe('getWeekDates', () => {
  it('returns exactly 5 dates', () => {
    const dates = getWeekDates(new Date(2026, 5, 10));
    expect(dates).toHaveLength(5);
  });

  it('starts on Monday', () => {
    const dates = getWeekDates(new Date(2026, 5, 10));
    expect(dates[0].getDay()).toBe(1); // 1 = Monday
  });

  it('ends on Friday', () => {
    const dates = getWeekDates(new Date(2026, 5, 10));
    expect(dates[4].getDay()).toBe(5); // 5 = Friday
  });

  it('dates are consecutive', () => {
    const dates = getWeekDates(new Date(2026, 5, 10));
    for (let i = 1; i < dates.length; i++) {
      const diff = dates[i].getTime() - dates[i - 1].getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000);
    }
  });
});

describe('formatWeekLabel', () => {
  it('formats start and end dates', () => {
    const start = new Date(2026, 5, 8);
    const end = new Date(2026, 5, 12);
    expect(formatWeekLabel(start, end)).toBe('Woche vom 8.6 - 12.6');
  });

  it('handles cross-month weeks', () => {
    const start = new Date(2026, 5, 29);
    const end = new Date(2026, 6, 3);
    expect(formatWeekLabel(start, end)).toBe('Woche vom 29.6 - 3.7');
  });
});

describe('getTodayStr', () => {
  it('returns an 8-character YYYYMMDD string', () => {
    const result = getTodayStr();
    expect(result).toHaveLength(8);
    expect(/^\d{8}$/.test(result)).toBe(true);
  });
});

describe('formatDayLabel', () => {
  it('returns a non-empty string for a valid date', () => {
    const result = formatDayLabel(new Date(2026, 5, 9));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('getWeekStart additional cases', () => {
  it('returns previous Monday for Saturday', () => {
    const saturday = new Date(2026, 5, 13); // Saturday 2026-06-13
    expect(formatDateStr(getWeekStart(saturday))).toBe('20260608');
  });
});

describe('addDays year boundary', () => {
  it('crosses year boundary', () => {
    const dec31 = new Date(2024, 11, 31);
    const jan1 = addDays(dec31, 1);
    expect(jan1.getFullYear()).toBe(2025);
    expect(jan1.getMonth()).toBe(0);
    expect(jan1.getDate()).toBe(1);
  });
});

describe('parseDateStr invalid input', () => {
  it('returns Invalid Date for empty string', () => {
    expect(isNaN(parseDateStr('').getTime())).toBe(true);
  });

  it('returns Invalid Date for non-numeric string', () => {
    expect(isNaN(parseDateStr('abcdefgh').getTime())).toBe(true);
  });
});

describe('parseGermanDateStr', () => {
  it('parses D.M.YYYY', () => {
    expect(parseGermanDateStr('16.6.2026')).toBe('20260616');
  });

  it('parses zero-padded D.M.YYYY', () => {
    expect(parseGermanDateStr('16.06.2026')).toBe('20260616');
  });

  it('parses D.M.YY with a 2-digit year', () => {
    expect(parseGermanDateStr('16.6.26')).toBe('20260616');
  });

  it('parses single-digit day and month', () => {
    expect(parseGermanDateStr('1.1.26')).toBe('20260101');
  });

  it('returns null for day 31 in a 30-day month', () => {
    expect(parseGermanDateStr('31.4.2026')).toBeNull();
  });

  it('returns null for month > 12', () => {
    expect(parseGermanDateStr('15.13.2026')).toBeNull();
  });

  it('returns null for day > 31', () => {
    expect(parseGermanDateStr('32.1.2026')).toBeNull();
  });

  it('returns null for day or month 0', () => {
    expect(parseGermanDateStr('0.1.2026')).toBeNull();
    expect(parseGermanDateStr('1.0.2026')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseGermanDateStr('abc')).toBeNull();
  });

  it('returns null for ISO format', () => {
    expect(parseGermanDateStr('2026-06-16')).toBeNull();
  });
});
