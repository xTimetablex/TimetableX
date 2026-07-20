import crypto from 'crypto';
import { Credentials } from '@/lib/types';

export const AUTH_COOKIE_NAME = 'timetablex_session';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

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

export function getAuthCredentials(request: Request): Credentials | null {
  const cookie = request.headers
    .get('cookie')
    ?.split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  return readAuthSession(cookie?.slice(AUTH_COOKIE_NAME.length + 1));
}

export function getPublicIdentity(credentials: Credentials) {
  return {
    school: credentials.school,
    user: credentials.user,
  };
}

export function getAccountId(credentials: Pick<Credentials, 'school' | 'user'>): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${credentials.school}\u0000${credentials.user}`)
    .digest('base64url');
}
