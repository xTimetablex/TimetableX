import { describe, expect, it, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  process.env.SQLITE_PATH = ':memory:';
});

describe('GET /api/calendar/[token]', () => {
  it('returns a text/calendar feed for a known token', async () => {
    // ponytail: upsertSubscriber must be imported dynamically (post vi.resetModules()),
    // not statically at module top — a static import binds to the pre-reset module
    // instance, which then writes to a different in-memory DB than the one the
    // dynamically-imported route resolves to. See subscriberStore.test.ts's
    // freshStore() for the same pattern.
    const { upsertSubscriber } = await import('../server/subscriberStore');
    const { icsToken } = upsertSubscriber({
      id: 'browser-1',
      credentials: { school: 'sample', user: 'x', pass: 'x' },
      favorites: [{ mode: 'class', value: '5/1' }],
      subscription: null,
    });

    const { GET } = await import('../../app/api/calendar/[token]/route');
    const response = await GET(new Request(`https://example.test/api/calendar/${icsToken}.ics`), {
      params: Promise.resolve({ token: `${icsToken}.ics` }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/calendar');
    const text = await response.text();
    expect(text).toContain('BEGIN:VCALENDAR');
  });

  it('returns 404 for an unknown token', async () => {
    const { GET } = await import('../../app/api/calendar/[token]/route');
    const response = await GET(new Request('https://example.test/api/calendar/nope.ics'), {
      params: Promise.resolve({ token: 'nope.ics' }),
    });

    expect(response.status).toBe(404);
  });
});
