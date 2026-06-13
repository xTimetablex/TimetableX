import { describe, expect, it } from 'vitest';
import { GET } from '../../app/api/public/timetable/route';

function basicAuthHeader(value: string): string {
  return `Basic ${Buffer.from(value).toString('base64')}`;
}

function request(query: string, auth = 'sample.x:x'): Request {
  return new Request(`https://example.test/api/public/timetable${query}`, {
    headers: { authorization: basicAuthHeader(auth) },
  });
}

describe('GET /api/public/timetable', () => {
  it('returns filtered entries for a class', async () => {
    const response = await GET(request('?class=9/2'));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.class).toBe('9/2');
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].subject).toBe('CH');
  });

  it('returns filtered entries for a room', async () => {
    const response = await GET(request('?room=313'));
    const body = await response.json();

    expect(body.room).toBe('313');
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].subject).toBe('MA');
  });

  it('returns all entries sorted by hour when no filter is given', async () => {
    const response = await GET(request(''));
    const body = await response.json();

    expect(body.class).toBeUndefined();
    expect(body.room).toBeUndefined();
    expect(body.teacher).toBeUndefined();
    expect(body.entries.map((e: { hour: string }) => e.hour)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('returns 5 days for week view', async () => {
    const response = await GET(request('?class=9/2&view=week'));
    const body = await response.json();

    expect(body.class).toBe('9/2');
    expect(body.days).toHaveLength(5);
    expect(body.days[0].entries).toHaveLength(1);
    expect(body.days[0].entries[0].subject).toBe('CH');
  });

  it('accepts a German-format date', async () => {
    const response = await GET(request('?class=9/2&date=16.6.2026'));
    expect(response.status).toBe(200);
  });

  it('returns 401 with WWW-Authenticate when the Authorization header is missing', async () => {
    const response = await GET(new Request('https://example.test/api/public/timetable'));

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="TimetableX Public API"');
  });

  it('returns 400 when more than one filter is given', async () => {
    const response = await GET(request('?class=9/2&room=313'));
    expect(response.status).toBe(400);
  });

  it('returns 400 for an invalid date', async () => {
    const response = await GET(request('?date=31.4.2026'));
    expect(response.status).toBe(400);
  });
});
