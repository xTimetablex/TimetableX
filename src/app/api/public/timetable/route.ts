import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseGermanDateStr } from '@/lib/date';
import { filterEntries } from '@/lib/filterEntries';
import { parseBasicAuth, unauthorizedResponse } from '@/lib/server/publicAuth';
import { fetchStundenplan, fetchWeekStundenplan } from '@/lib/stundenplan';
import { FilterMode, TimetableData } from '@/lib/types';

const QuerySchema = z.object({
  date: z.string().optional(),
  view: z.enum(['day', 'week']).optional(),
  class: z.string().optional(),
  room: z.string().optional(),
  teacher: z.string().optional(),
});

type Filter = { mode: FilterMode; value: string };

function shapeDay(day: TimetableData, filter: Filter | null) {
  const entries = filter
    ? filterEntries(day.entries, filter.mode, filter.value, [])
    : day.entries.toSorted((a, b) => (parseInt(a.hour) || 0) - (parseInt(b.hour) || 0));

  return {
    date: day.date,
    dateStr: day.currentDateStr,
    entries,
    ...(day.dayNotes ? { dayNotes: day.dayNotes } : {}),
    ...(day.isWeekend ? { isWeekend: day.isWeekend } : {}),
  };
}

export async function GET(request: Request) {
  const credentials = parseBasicAuth(request);
  if (!credentials) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const result = QuerySchema.safeParse({
    date: searchParams.get('date') ?? undefined,
    view: searchParams.get('view') ?? undefined,
    class: searchParams.get('class') ?? undefined,
    room: searchParams.get('room') ?? undefined,
    teacher: searchParams.get('teacher') ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { date, view, class: classFilter, room: roomFilter, teacher: teacherFilter } = result.data;

  const filters: Filter[] = [];
  if (classFilter) filters.push({ mode: 'class', value: classFilter });
  if (roomFilter) filters.push({ mode: 'room', value: roomFilter });
  if (teacherFilter) filters.push({ mode: 'teacher', value: teacherFilter });

  if (filters.length > 1) {
    return NextResponse.json(
      { error: 'Nur einer von class, room oder teacher darf angegeben werden.' },
      { status: 400 }
    );
  }
  const filter = filters[0] ?? null;

  let dateStr: string | undefined;
  if (date) {
    const parsed = parseGermanDateStr(date);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Ungültiges Datum (erwartet: T.M.JJJJ).' },
        { status: 400 }
      );
    }
    dateStr = parsed;
  }

  const { school, user, pass } = credentials;
  const filterField = filter ? { [filter.mode]: filter.value } : {};

  try {
    if (view === 'week') {
      const weekData = await fetchWeekStundenplan(school, user, pass, dateStr);
      return NextResponse.json({
        ...filterField,
        days: weekData.days.map(day => shapeDay(day, filter)),
      });
    }

    const dayData = await fetchStundenplan(school, user, pass, dateStr);
    return NextResponse.json({
      ...filterField,
      ...shapeDay(dayData, filter),
    });
  } catch (e: any) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('Ungültig')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.includes('Verbindung')) {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json({ error: message || 'Interner Serverfehler.' }, { status: 500 });
  }
}
