import { NextResponse } from 'next/server';
import { getSubscriberByIcsToken } from '@/lib/server/subscriberStore';
import { fetchWeekStundenplan } from '@/lib/stundenplan';
import { buildIcsCalendar } from '@/lib/ics';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const token = rawToken.replace(/\.ics$/, '');

  const subscriber = getSubscriberByIcsToken(token);
  if (!subscriber) {
    return NextResponse.json({ error: 'Unbekannter Kalender-Link.' }, { status: 404 });
  }

  const { credentials, favorites } = subscriber;
  const classes = favorites.filter(f => f.mode === 'class').map(f => f.value);

  const week = await fetchWeekStundenplan(credentials.school, credentials.user, credentials.pass);
  const ics = buildIcsCalendar(week, classes);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="timetablex.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
