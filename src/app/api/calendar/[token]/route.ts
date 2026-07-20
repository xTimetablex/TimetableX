import { NextResponse } from 'next/server';
import { getFeedByToken } from '@/lib/server/feedStore';
import { getSchoolWeek } from '@/lib/server/timetableCache';
import { buildIcsCalendar } from '@/lib/ics';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const token = rawToken.replace(/\.ics$/, '');

  const feed = getFeedByToken(token);
  if (!feed) {
    return NextResponse.json({ error: 'Unbekannter Kalender-Link.' }, { status: 404 });
  }

  const week = await getSchoolWeek(feed.school);
  const ics = buildIcsCalendar(week, { type: feed.entityType, value: feed.entityValue });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="timetablex.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
