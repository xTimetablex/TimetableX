import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createAuthSession, AUTH_COOKIE_NAME } from '../server/authSession';

const CREDS = { school: '12345', user: 'testuser', pass: 'testpass' };

function requestWithCookie(body: unknown, method: 'POST' | 'DELETE' = 'POST'): Request {
  return new Request('https://example.test/api/notifications/subscribe', {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie: `${AUTH_COOKIE_NAME}=${createAuthSession(CREDS)}`,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetModules();
  process.env.SQLITE_PATH = ':memory:';
});

describe('POST /api/notifications/subscribe', () => {
  it('stores the subscription and returns an ics feed URL', async () => {
    const { POST } = await import('../../app/api/notifications/subscribe/route');
    const response = await POST(
      requestWithCookie({
        id: 'browser-1',
        favorites: [{ mode: 'class', value: '9/2' }],
        subscription: { endpoint: 'https://push.example/x', keys: { p256dh: 'k', auth: 'a' } },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.icsUrl).toContain('/api/calendar/');
  });

  it('rejects when there is no auth session cookie', async () => {
    const { POST } = await import('../../app/api/notifications/subscribe/route');
    const response = await POST(
      new Request('https://example.test/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'browser-2', favorites: [], subscription: null }),
      })
    );

    expect(response.status).toBe(401);
  });

  it('rejects a malformed body', async () => {
    const { POST } = await import('../../app/api/notifications/subscribe/route');
    const response = await POST(requestWithCookie({ id: 'browser-3' }));

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/notifications/subscribe', () => {
  it('removes the subscriber', async () => {
    const { POST, DELETE } = await import('../../app/api/notifications/subscribe/route');
    await POST(
      requestWithCookie({
        id: 'browser-4',
        favorites: [{ mode: 'class', value: '9/2' }],
        subscription: { endpoint: 'https://push.example/x', keys: { p256dh: 'k', auth: 'a' } },
      })
    );

    const response = await DELETE(requestWithCookie({ id: 'browser-4' }, 'DELETE'));
    expect(response.status).toBe(200);
  });
});
