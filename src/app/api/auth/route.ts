import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  createAuthSession,
  getAuthCredentials,
  getPublicIdentity,
} from '@/lib/server/authSession';
import { upsertAccount } from '@/lib/server/accountStore';

const LoginSchema = z.object({
  school: z.string().min(1, 'Schulnummer fehlt.'),
  user: z.string().min(1, 'Benutzername fehlt.'),
  pass: z.string().min(1, 'Passwort fehlt.'),
});

export async function GET(request: Request) {
  const credentials = getAuthCredentials(request);

  if (!credentials) {
    return NextResponse.json({ identity: null }, { status: 401 });
  }

  return NextResponse.json({ identity: getPublicIdentity(credentials) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = LoginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || 'Ungültige Anfrage.' },
      { status: 400 }
    );
  }

  upsertAccount(result.data);
  const response = NextResponse.json({ identity: getPublicIdentity(result.data) });
  response.cookies.set(AUTH_COOKIE_NAME, createAuthSession(result.data), authCookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, '', { ...authCookieOptions, maxAge: 0 });
  return response;
}
