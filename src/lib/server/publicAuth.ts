import { NextResponse } from 'next/server';
import { Credentials } from '@/lib/types';

export const AUTH_ERROR_MESSAGE =
  'Authentifizierung erforderlich (Basic Auth: SCHULNUMMER.BENUTZERNAME:PASSWORT).';

export function parseBasicAuth(request: Request): Credentials | null {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Basic ')) return null;

  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return null;

  const username = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);

  const dotIndex = username.indexOf('.');
  if (dotIndex === -1) return null;

  const school = username.slice(0, dotIndex);
  const user = username.slice(dotIndex + 1);
  if (!school || !user || !pass) return null;

  return { school, user, pass };
}

export function unauthorizedResponse(): NextResponse {
  const response = NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });
  response.headers.set('WWW-Authenticate', 'Basic realm="TimetableX Public API"');
  return response;
}
