import { describe, expect, it } from 'vitest';
import { AUTH_ERROR_MESSAGE, parseBasicAuth, unauthorizedResponse } from '../server/publicAuth';

function basicAuthHeader(value: string): string {
  return `Basic ${Buffer.from(value).toString('base64')}`;
}

function withAuth(value: string): Request {
  return new Request('https://example.test/api/public/timetable', {
    headers: { authorization: basicAuthHeader(value) },
  });
}

describe('parseBasicAuth', () => {
  it('parses school, user, and pass from school.user:pass', () => {
    expect(parseBasicAuth(withAuth('12345.jdoe:secret'))).toEqual({
      school: '12345',
      user: 'jdoe',
      pass: 'secret',
    });
  });

  it('splits the username on the first dot only', () => {
    expect(parseBasicAuth(withAuth('12345.j.doe:secret'))).toEqual({
      school: '12345',
      user: 'j.doe',
      pass: 'secret',
    });
  });

  it('allows colons in the password', () => {
    expect(parseBasicAuth(withAuth('12345.jdoe:sec:ret'))).toEqual({
      school: '12345',
      user: 'jdoe',
      pass: 'sec:ret',
    });
  });

  it('returns null when the Authorization header is missing', () => {
    const request = new Request('https://example.test/api/public/timetable');
    expect(parseBasicAuth(request)).toBeNull();
  });

  it('returns null for a non-Basic scheme', () => {
    const request = new Request('https://example.test/api/public/timetable', {
      headers: { authorization: 'Bearer sometoken' },
    });
    expect(parseBasicAuth(request)).toBeNull();
  });

  it('returns null when the username has no school separator', () => {
    expect(parseBasicAuth(withAuth('jdoe:secret'))).toBeNull();
  });

  it('returns null for malformed base64', () => {
    const request = new Request('https://example.test/api/public/timetable', {
      headers: { authorization: 'Basic ???' },
    });
    expect(parseBasicAuth(request)).toBeNull();
  });
});

describe('unauthorizedResponse', () => {
  it('returns a 401 with a WWW-Authenticate header and error body', async () => {
    const response = unauthorizedResponse();

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="TimetableX Public API"');
    await expect(response.json()).resolves.toEqual({ error: AUTH_ERROR_MESSAGE });
  });
});
