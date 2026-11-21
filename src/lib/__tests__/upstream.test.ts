import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearTimetableCache,
  fetchStundenplan,
  getTimetableErrorStatus,
  TimetableAuthError,
  TimetableUnavailableError,
} from '../stundenplan';

const XML = `<?xml version="1.0" encoding="utf-8"?>
<WplanVp>
  <Kopf>
    <DatumPlan>Donnerstag, 12. November 2026</DatumPlan>
    <zeitstempel>12.11.2026, 07:12</zeitstempel>
  </Kopf>
  <Klassen>
    <Kl>
      <Kurz>5/1</Kurz>
      <Pl>
        <Std><St>1</St><Fa>MA</Fa><Le LeAe="LeGeaendert">MEY</Le><Ra>313</Ra><If>Vertretung für Hr. Knorr</If></Std>
        <Std><St>2</St><Fa FaAe="FaGeaendert">---</Fa><Le>---</Le><Ra>---</Ra><If>Deutsch entfällt</If></Std>
      </Pl>
    </Kl>
  </Klassen>
  <ZusatzInfo><ZiZeile>Unterrichtsschluss nach der 4. Stunde</ZiZeile></ZusatzInfo>
</WplanVp>`;

function stubFetch(response: () => Response | Promise<Response>) {
  const fetchMock = vi.fn().mockImplementation(async () => response());
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchStundenplan', () => {
  beforeEach(() => {
    clearTimetableCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses the plan and keeps the timestamp separate from the date', async () => {
    stubFetch(() => new Response(XML, { status: 200 }));

    const day = await fetchStundenplan('12345678', 'user', 'pass', '20261112');

    expect(day.date).toBe('Donnerstag, 12. November 2026');
    expect(day.updatedAt).toBe('12.11.2026, 07:12');
    expect(day.dayNotes).toEqual(['Unterrichtsschluss nach der 4. Stunde']);
    expect(day.entries).toHaveLength(2);
    expect(day.entries[0]).toMatchObject({ teacher: 'MEY', teacherChanged: true, roomChanged: false });
    expect(day.entries[1]).toMatchObject({ subject: '---', subjectChanged: true });
    expect(day.availableClasses).toEqual(['5/1']);
    expect(day.availableTeachers).toEqual(['MEY']);
  });

  it('treats 404 as "no plan published"', async () => {
    stubFetch(() => new Response('', { status: 404 }));

    const day = await fetchStundenplan('12345678', 'user', 'pass', '20261112');

    expect(day.entries).toEqual([]);
    expect(day.isWeekend).toBe(false);
  });

  it('marks weekend days without a plan', async () => {
    stubFetch(() => new Response('', { status: 404 }));
    expect((await fetchStundenplan('12345678', 'user', 'pass', '20261114')).isWeekend).toBe(true);
  });

  it('fails on server errors instead of showing an empty day', async () => {
    stubFetch(() => new Response('', { status: 503 }));

    const result = fetchStundenplan('12345678', 'user', 'pass', '20261112');
    await expect(result).rejects.toBeInstanceOf(TimetableUnavailableError);
    await expect(result).rejects.toThrow('HTTP 503');
  });

  it('reports wrong credentials', async () => {
    stubFetch(() => new Response('', { status: 401 }));
    await expect(fetchStundenplan('12345678', 'user', 'pass', '20261112')).rejects.toBeInstanceOf(
      TimetableAuthError
    );
  });

  it('reports network failures as unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(fetchStundenplan('12345678', 'user', 'pass', '20261112')).rejects.toBeInstanceOf(
      TimetableUnavailableError
    );
  });

  it('shares one upstream request between concurrent and repeated calls', async () => {
    const fetchMock = stubFetch(() => new Response(XML, { status: 200 }));

    await Promise.all([
      fetchStundenplan('12345678', 'user', 'pass', '20261112'),
      fetchStundenplan('12345678', 'user', 'pass', '20261112'),
    ]);
    await fetchStundenplan('12345678', 'user', 'pass', '20261112');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keys the cache by credentials', async () => {
    const fetchMock = stubFetch(() => new Response(XML, { status: 200 }));

    await fetchStundenplan('12345678', 'user', 'pass', '20261112');
    await fetchStundenplan('12345678', 'user', 'other-pass', '20261112');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    let status = 503;
    const fetchMock = stubFetch(() => new Response(status === 200 ? XML : '', { status }));

    await expect(fetchStundenplan('12345678', 'user', 'pass', '20261112')).rejects.toThrow();
    status = 200;
    await expect(fetchStundenplan('12345678', 'user', 'pass', '20261112')).resolves.toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never calls stundenplan24 for the demo school', async () => {
    const fetchMock = stubFetch(() => new Response('', { status: 500 }));
    const day = await fetchStundenplan('demo', 'x', 'x', '20261112');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(day.currentDateStr).toBe('20261112');
    expect(day.entries.length).toBeGreaterThan(0);
  });
});

describe('getTimetableErrorStatus', () => {
  it('maps error types to HTTP statuses', () => {
    expect(getTimetableErrorStatus(new TimetableAuthError())).toBe(401);
    expect(getTimetableErrorStatus(new TimetableUnavailableError())).toBe(502);
    expect(getTimetableErrorStatus(new Error('kaputt'))).toBe(500);
  });
});
