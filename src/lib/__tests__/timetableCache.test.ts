import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, formatDateStr, getWeekStart } from '../date';
import type { Credentials, TimetableWeekData } from '../types';

// Each test re-imports timetableCache after vi.resetModules() so its module-level school cache
// starts empty. Resetting that boundary requires a per-test dynamic import, not a static one.

const mocks = vi.hoisted(() => ({
  fetchWeekStundenplan: vi.fn(),
  getCredentialsForSchool: vi.fn(),
}));

vi.mock('../stundenplan', () => ({ fetchWeekStundenplan: mocks.fetchWeekStundenplan }));
vi.mock('../server/accountStore', () => ({ getCredentialsForSchool: mocks.getCredentialsForSchool }));

function makeWeek(currentDateStr: string): TimetableWeekData {
  return {
    title: 'Stundenplan',
    date: 'Woche',
    currentDateStr,
    weekStartStr: currentDateStr,
    availableClasses: ['9/2'],
    availableRooms: ['313'],
    availableTeachers: ['KNO'],
    days: [
      {
        title: 'Stundenplan',
        date: `Tag ${currentDateStr}`,
        currentDateStr,
        entries: [{ class: '9/2', hour: '1', subject: 'MA', teacher: 'KNO', room: '313', info: '---' }],
        availableClasses: ['9/2'],
        availableRooms: ['313'],
        availableTeachers: ['KNO'],
      },
    ],
  };
}

const creds = (user: string): Credentials => ({ school: 'sample', user, pass: 'x' });

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 10, 12, 0, 0));
  mocks.fetchWeekStundenplan.mockReset();
  mocks.getCredentialsForSchool.mockReset();
  mocks.getCredentialsForSchool.mockReturnValue([creds('good')]);
  mocks.fetchWeekStundenplan.mockImplementation(async (_school, _user, _pass, dateStr) =>
    makeWeek(dateStr ?? 'unknown')
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getSchoolWeek', () => {
  it('fetches the 7-week window from 3 weeks past to 3 weeks future', async () => {
    const weekStart = getWeekStart(new Date(2026, 5, 10, 12, 0, 0));
    const expectedAnchors = Array.from({ length: 7 }, (_, index) =>
      formatDateStr(addDays(weekStart, (index - 3) * 7))
    );

    const { getSchoolWeek } = await import('../server/timetableCache');
    await getSchoolWeek('sample');

    expect(mocks.fetchWeekStundenplan).toHaveBeenCalledTimes(7);
    expect(mocks.fetchWeekStundenplan.mock.calls.map(call => call[3])).toEqual(expectedAnchors);
  });

  it('serves repeated pulls from cache without refetching', async () => {
    const { getSchoolWeek } = await import('../server/timetableCache');
    await getSchoolWeek('sample');
    await getSchoolWeek('sample');

    expect(mocks.fetchWeekStundenplan).toHaveBeenCalledTimes(7);
  });

  it('falls back to the next credential when the first fails auth', async () => {
    mocks.getCredentialsForSchool.mockReturnValue([creds('stale'), creds('good')]);
    mocks.fetchWeekStundenplan.mockImplementation(async (_school, user, _pass, dateStr) => {
      if (user === 'stale') throw new Error('Ungültige Anmeldedaten.');
      return makeWeek(dateStr ?? 'unknown');
    });

    const { getSchoolWeek } = await import('../server/timetableCache');
    const week = await getSchoolWeek('sample');

    expect(week.days.length).toBeGreaterThan(0);
    expect(mocks.fetchWeekStundenplan.mock.calls.some(call => call[1] === 'good')).toBe(true);
  });

  it('throws when no credentials exist for the school', async () => {
    mocks.getCredentialsForSchool.mockReturnValue([]);
    const { getSchoolWeek } = await import('../server/timetableCache');
    await expect(getSchoolWeek('sample')).rejects.toThrow();
  });
});
