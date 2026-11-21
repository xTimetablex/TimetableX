import crypto from 'crypto';
import type { NextResponse } from 'next/server';
import { Credentials } from '@/lib/types';

export const AUTH_COOKIE_NAME = 'timetablex_session';

// Sliding expiry: every authenticated API call renews the cookie (see
// refreshAuthCookie), so only 90 days without opening the app log you out.
// Long enough to survive the six-week summer holidays.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: COOKIE_MAX_AGE_SECONDS,
};

function getSecret(): string {
  return (
    process.env.TIMETABLEX_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'timetablex-development-secret-change-me'
  );
}

function getKey(): Buffer {
  return crypto.createHash('sha256').update(getSecret()).digest();
}

export function createAuthSession(credentials: Credentials): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function readAuthSession(value: string | undefined): Credentials | null {
  if (!value) return null;

  try {
    const payload = Buffer.from(value, 'base64url');
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const parsed = JSON.parse(json);

    if (
      typeof parsed?.school === 'string' &&
      typeof parsed?.user === 'string' &&
      typeof parsed?.pass === 'string'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function getAuthCookieValue(request: Request): string | undefined {
  const cookie = request.headers
    .get('cookie')
    ?.split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  return cookie?.slice(AUTH_COOKIE_NAME.length + 1);
}

export function getAuthCredentials(request: Request): Credentials | null {
  return readAuthSession(getAuthCookieValue(request));
}

/** Re-sets the (valid) session cookie on a response to restart its max age. */
export function refreshAuthCookie(request: Request, response: NextResponse): NextResponse {
  const value = getAuthCookieValue(request);
  if (value && readAuthSession(value)) {
    response.cookies.set(AUTH_COOKIE_NAME, value, authCookieOptions);
  }
  return response;
}

export function getPublicIdentity(credentials: Credentials) {
  return {
    school: credentials.school,
    user: credentials.user,
  };
}
