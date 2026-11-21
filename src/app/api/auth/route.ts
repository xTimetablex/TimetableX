import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  createAuthSession,
  getAuthCredentials,
  getPublicIdentity,
  refreshAuthCookie,
} from '@/lib/server/authSession';
import { fetchStundenplan, getTimetableErrorStatus } from '@/lib/stundenplan';

const LoginSchema = z.object({
  school: z.string().trim().min(1, 'Schulnummer fehlt.'),
  user: z.string().trim().min(1, 'Benutzername fehlt.'),
  pass: z.string().min(1, 'Passwort fehlt.'),
});

export async function GET(request: Request) {
  const credentials = getAuthCredentials(request);

  if (!credentials) {
    return NextResponse.json({ identity: null }, { status: 401 });
  }

  return refreshAuthCookie(request, NextResponse.json({ identity: getPublicIdentity(credentials) }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = LoginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || 'Ungültige Anfrage.' },
      { status: 400 }
    );
  }

  // Check the credentials against stundenplan24 before storing them, so a
  // typo fails here, on the login form, instead of on the first plan fetch.
  // A missing plan (404) still proves the credentials work. As a bonus the
  // fetched plan lands in the server cache for the page load that follows.
  const { school, user, pass } = result.data;
  try {
    await fetchStundenplan(school, user, pass);
  } catch (e) {
    const status = getTimetableErrorStatus(e);
    if (status !== 401) Sentry.captureException(e);
    const message =
      status === 401
        ? 'Schulnummer, Benutzername oder Passwort stimmt nicht.'
        : status === 502
          ? 'stundenplan24.de ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.'
          : 'Anmeldung fehlgeschlagen.';
    return NextResponse.json({ error: message }, { status });
  }

  const response = NextResponse.json({ identity: getPublicIdentity(result.data) });
  response.cookies.set(AUTH_COOKIE_NAME, createAuthSession(result.data), authCookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, '', { ...authCookieOptions, maxAge: 0 });
  return response;
}
