import { describe, expect, it } from 'vitest';
import {
  formatDateStr,
  formatUpdatedAt,
  getDefaultDateStr,
  getSchoolClock,
  getSchoolWeekDates,
  getSchoolWeekStart,
  getTodayStr,
  isValidDateStr,
  shiftSchoolDay,
} from '../date';

// Instants are given in UTC; Berlin is UTC+1 in winter and UTC+2 in summer.
const at = (iso: string) => new Date(iso);

describe('getSchoolClock / getTodayStr', () => {
  it('uses Berlin time, not the server zone (UTC)', () => {
    // 23:30 UTC on Nov 11 is already 00:30 on Nov 12 in Berlin.
    expect(getTodayStr(at('2026-11-11T23:30:00Z'))).toBe('20261112');
    expect(getSchoolClock(at('2026-11-11T23:30:00Z')).hour).toBe(0);
  });

  it('handles summer time', () => {
    // 22:30 UTC on Jun 9 is 00:30 on Jun 10 in Berlin (UTC+2).
    expect(getTodayStr(at('2026-06-09T22:30:00Z'))).toBe('20260610');
  });
});

describe('getDefaultDateStr', () => {
  it('opens on today during a school day', () => {
    // Thursday 2026-11-12, 08:00 Berlin
    expect(getDefaultDateStr(at('2026-11-12T07:00:00Z'))).toBe('20261112');
  });

  it('opens on the next school day once school is over', () => {
    // Thursday 2026-11-12, 17:00 Berlin
    expect(getDefaultDateStr(at('2026-11-12T16:00:00Z'))).toBe('20261113');
  });

  it('jumps from Friday afternoon to Monday', () => {
    // Friday 2026-11-13, 18:00 Berlin
    expect(getDefaultDateStr(at('2026-11-13T17:00:00Z'))).toBe('20261116');
  });

  it('opens on Monday during the weekend', () => {
    // Saturday 2026-11-14, 10:00 and Sunday 2026-11-15, 10:00 Berlin
    expect(getDefaultDateStr(at('2026-11-14T09:00:00Z'))).toBe('20261116');
    expect(getDefaultDateStr(at('2026-11-15T09:00:00Z'))).toBe('20261116');
  });
});

describe('shiftSchoolDay', () => {
  it('moves one weekday forward and back', () => {
    expect(shiftSchoolDay('20261112', 1)).toBe('20261113');
    expect(shiftSchoolDay('20261112', -1)).toBe('20261111');
  });

  it('skips the weekend', () => {
    expect(shiftSchoolDay('20261113', 1)).toBe('20261116'); // Fri → Mon
    expect(shiftSchoolDay('20261116', -1)).toBe('20261113'); // Mon → Fri
  });

  it('starts from a weekend day', () => {
    expect(shiftSchoolDay('20261114', 1)).toBe('20261116'); // Sat → Mon
    expect(shiftSchoolDay('20261115', -1)).toBe('20261113'); // Sun → Fri
  });
});

describe('getSchoolWeekStart / getSchoolWeekDates', () => {
  it('returns Monday of the week for weekdays', () => {
    expect(formatDateStr(getSchoolWeekStart(new Date(2026, 10, 12)))).toBe('20261109');
  });

  it('looks ahead to the coming week on weekends', () => {
    expect(formatDateStr(getSchoolWeekStart(new Date(2026, 10, 14)))).toBe('20261116');
    expect(formatDateStr(getSchoolWeekStart(new Date(2026, 10, 15)))).toBe('20261116');
  });

  it('returns Monday to Friday', () => {
    expect(getSchoolWeekDates(new Date(2026, 10, 14)).map(formatDateStr)).toEqual([
      '20261116',
      '20261117',
      '20261118',
      '20261119',
      '20261120',
    ]);
  });
});

describe('isValidDateStr', () => {
  it('accepts real dates only', () => {
    expect(isValidDateStr('20261112')).toBe(true);
    expect(isValidDateStr('20260231')).toBe(false);
    expect(isValidDateStr('2026-11-12')).toBe(false);
    expect(isValidDateStr(undefined)).toBe(false);
  });
});

describe('formatUpdatedAt', () => {
  it('says "heute" for a timestamp from today', () => {
    expect(formatUpdatedAt('12.11.2026, 07:12', '20261112')).toBe('Stand: heute, 07:12');
  });

  it('shows the date for older timestamps', () => {
    expect(formatUpdatedAt('11.11.2026, 15:30', '20261112')).toBe('Stand: 11.11., 15:30');
  });

  it('passes unknown formats through and ignores empty values', () => {
    expect(formatUpdatedAt('Beispieldaten', '20261112')).toBe('Stand: Beispieldaten');
    expect(formatUpdatedAt(undefined, '20261112')).toBeNull();
    expect(formatUpdatedAt('  ', '20261112')).toBeNull();
  });
});
