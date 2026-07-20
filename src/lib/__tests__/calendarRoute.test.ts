import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimetableWeekData } from '../types';

const mocks = vi.hoisted(() => ({
  getFeedByToken: vi.fn(),
  getSchoolWeek: vi.fn(),
}));

vi.mock('../server/feedStore', () => ({ getFeedByToken: mocks.getFeedByToken }));
vi.mock('../server/timetableCache', () => ({ getSchoolWeek: mocks.getSchoolWeek }));

function makeWeek(): TimetableWeekData {
  return {
    title: 'Stundenplan',
    date: 'Woche',
    currentDateStr: '20260610',
    weekStartStr: '20260608',
    availableClasses: ['9/2', '10/1'],
    availableRooms: ['313', '311'],
    availableTeachers: ['KNO', 'MEY'],
    days: [
      {
        title: 'Stundenplan',
        date: 'Mittwoch',
        currentDateStr: '20260610',
        entries: [
          { class: '9/2', hour: '1', subject: 'MA', teacher: 'KNO', room: '313', info: '---' },
          { class: '10/1', hour: '2', subject: 'DE', teacher: 'MEY', room: '311', info: '---' },
        ],
        availableClasses: ['9/2', '10/1'],
        availableRooms: ['313', '311'],
        availableTeachers: ['KNO', 'MEY'],
      },
    ],
  };
}

// Re-imports the route after vi.resetModules() so mock wiring is fresh per test; resetting that
// module boundary requires a dynamic import rather than a static one.
async function loadRoute() {
  return import('../../app/api/calendar/[token]/route');
}
function icsRequest(token: string) {
  return {
    request: new Request(`https://example.test/api/calendar/${token}`),
    params: Promise.resolve({ token }),
  };
}

beforeEach(() => {
  vi.resetModules();
  mocks.getFeedByToken.mockReset();
  mocks.getSchoolWeek.mockReset();
  mocks.getSchoolWeek.mockResolvedValue(makeWeek());
});

describe('GET /api/calendar/[token]', () => {
  it('serves a class feed as text/calendar with only that class', async () => {
    mocks.getFeedByToken.mockReturnValue({
      token: 't',
      school: 'sample',
      entityType: 'class',
      entityValue: '9/2',
    });

    const { GET } = await loadRoute();
    const { request, params } = icsRequest('t.ics');
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/calendar');
    expect(mocks.getFeedByToken).toHaveBeenCalledWith('t');
    expect(mocks.getSchoolWeek).toHaveBeenCalledWith('sample');

    const text = await response.text();
    expect(text).toContain('SUMMARY:MA');
    expect(text).not.toContain('SUMMARY:DE');
  });

  it('serves a teacher feed with the class appended to the summary', async () => {
    mocks.getFeedByToken.mockReturnValue({
      token: 't',
      school: 'sample',
      entityType: 'teacher',
      entityValue: 'MEY',
    });

    const { GET } = await loadRoute();
    const { request, params } = icsRequest('t.ics');
    const response = await GET(request, { params });

    const text = await response.text();
    expect(text).toContain('SUMMARY:DE · 10/1');
    expect(text).not.toContain('SUMMARY:MA');
  });

  it('returns 404 for an unknown token', async () => {
    mocks.getFeedByToken.mockReturnValue(null);

    const { GET } = await loadRoute();
    const { request, params } = icsRequest('nope.ics');
    const response = await GET(request, { params });

    expect(response.status).toBe(404);
    expect(mocks.getSchoolWeek).not.toHaveBeenCalled();
  });
});
