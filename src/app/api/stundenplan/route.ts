import { fetchStundenplan, fetchWeekStundenplan, getTimetableErrorStatus } from '@/lib/stundenplan';
import { getAuthCredentials, refreshAuthCookie } from '@/lib/server/authSession';
import { isValidDateStr } from '@/lib/date';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

const RequestSchema = z.object({
  date: z.string().refine(isValidDateStr, 'Ungültiges Datum (erwartet: JJJJMMTT).').optional(),
  view: z.enum(['day', 'week']).optional(),
});

export async function POST(request: Request) {
  const credentials = getAuthCredentials(request);
  if (!credentials) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = RequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { school, user, pass } = credentials;
  const { date, view } = result.data;

  try {
    const data =
      view === 'week'
        ? await fetchWeekStundenplan(school, user, pass, date)
        : await fetchStundenplan(school, user, pass, date);

    return refreshAuthCookie(request, NextResponse.json(data));
  } catch (e: unknown) {
    const status = getTimetableErrorStatus(e);
    // Wrong credentials are a user error, not a bug.
    if (status !== 401) Sentry.captureException(e);
    console.error('API Error:', e);
    const message = e instanceof Error && e.message
      ? e.message
      : 'Interner Serverfehler beim Laden des Stundenplans.';
    return NextResponse.json({ error: message }, { status });
  }
}
