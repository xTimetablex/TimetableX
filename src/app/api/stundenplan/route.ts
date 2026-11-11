import { fetchStundenplan, fetchWeekStundenplan } from '@/lib/stundenplan';
import { getAuthCredentials } from '@/lib/server/authSession';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

const RequestSchema = z.object({
  date: z.string().optional(),
  view: z.enum(['day', 'week']).optional(),
});

export async function POST(request: Request) {
  try {
    const credentials = getAuthCredentials(request);
    if (!credentials) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const body = await request.json();
    const result = RequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { school, user, pass } = credentials;
    const { date, view } = result.data;
    const data =
      view === 'week'
        ? await fetchWeekStundenplan(school, user, pass, date)
        : await fetchStundenplan(school, user, pass, date);

    return NextResponse.json(data);
  } catch (e: any) {
    // Wrong credentials are a user error, not a bug.
    if (!e?.message?.includes('Ungültig')) Sentry.captureException(e);
    console.error('API Error:', e);
    return NextResponse.json(
      { error: e.message || 'Interner Serverfehler beim Laden des Stundenplans.' },
      { status: 500 }
    );
  }
}
