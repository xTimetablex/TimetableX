import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../app/api/auth/route';
import { POST as postStundenplan } from '../../app/api/stundenplan/route';
import { AUTH_COOKIE_NAME, createAuthSession } from '../server/authSession';
import { clearTimetableCache } from '../stundenplan';

function login(body: unknown): Promise<Response> {
  return POST(
    new Request('https://example.test/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/auth', () => {
  beforeEach(() => {
    clearTimetableCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs into the demo school without contacting stundenplan24', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await login({ school: 'demo', user: 'demo', pass: 'demo' });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain(`${AUTH_COOKIE_NAME}=`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects wrong credentials without setting a session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));

    const response = await login({ school: '12345678', user: 'alice', pass: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect((await response.json()).error).toContain('stimmt nicht');
  });

  it('accepts working credentials even when no plan is published today', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));

    const response = await login({ school: '12345678', user: 'alice', pass: 'secret' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ identity: { school: '12345678', user: 'alice' } });
  });

  it('reports an unreachable stundenplan24 as 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));

    const response = await login({ school: '12345678', user: 'alice', pass: 'secret' });

    expect(response.status).toBe(502);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('trims the school number and user name', async () => {
    const response = await login({ school: ' demo ', user: ' alice ', pass: 'x' });
    expect(await response.json()).toEqual({ identity: { school: 'demo', user: 'alice' } });
  });
});

describe('POST /api/stundenplan', () => {
  const session = createAuthSession({ school: 'demo', user: 'alice', pass: 'x' });

  function request(body: unknown, cookie = `${AUTH_COOKIE_NAME}=${session}`) {
    return new Request('https://example.test/api/stundenplan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify(body),
    });
  }

  it('returns the day and renews the session cookie', async () => {
    const response = await postStundenplan(request({ date: '20261112' }));

    expect(response.status).toBe(200);
    expect((await response.json()).currentDateStr).toBe('20261112');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=7776000');
  });

  it('answers 401 without a session', async () => {
    expect((await postStundenplan(request({}, ''))).status).toBe(401);
  });

  it('rejects malformed dates', async () => {
    expect((await postStundenplan(request({ date: '2026-11-12' }))).status).toBe(400);
  });

  it('maps upstream auth failures to 401', async () => {
    clearTimetableCache();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    const realSession = createAuthSession({ school: '12345678', user: 'alice', pass: 'old' });

    const response = await postStundenplan(request({ date: '20261112' }, `${AUTH_COOKIE_NAME}=${realSession}`));

    expect(response.status).toBe(401);
    vi.unstubAllGlobals();
  });
});
