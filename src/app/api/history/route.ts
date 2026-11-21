import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getTodayStr } from '@/lib/date';
import { buildHistory, getRecentSchoolDays, HISTORY_SCHOOL_DAYS } from '@/lib/history';
import { getAuthCredentials, refreshAuthCookie } from '@/lib/server/authSession';
import { fetchStundenplan, getTimetableErrorStatus } from '@/lib/stundenplan';
import { TimetableData } from '@/lib/types';

const FETCH_CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += limit) {
    results.push(...(await Promise.allSettled(items.slice(i, i + limit).map(handler))));
  }
  return results;
}

/**
 * Classes, rooms, teachers and per-entity subjects seen over the last
 * HISTORY_SCHOOL_DAYS school days. Feeds the picker (entities missing from
 * today's plan) and the "hide subjects" dialog in one small response.
 */
export async function GET(request: Request) {
  const credentials = getAuthCredentials(request);
  if (!credentials) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const { school, user, pass } = credentials;
  const dates = getRecentSchoolDays(HISTORY_SCHOOL_DAYS, getTodayStr());
  const settled = await mapWithConcurrency(dates, FETCH_CONCURRENCY, date =>
    fetchStundenplan(school, user, pass, date)
  );

  const days: TimetableData[] = [];
  const errors: unknown[] = [];
  for (const item of settled) {
    if (item.status === 'fulfilled') days.push(item.value);
    else errors.push(item.reason);
  }

  const authError = errors.find(error => getTimetableErrorStatus(error) === 401);
  if (authError) {
    return NextResponse.json({ error: (authError as Error).message }, { status: 401 });
  }

  if (days.length === 0) {
    Sentry.captureException(errors[0]);
    return NextResponse.json(
      { error: 'Die letzten Pläne konnten nicht geladen werden.' },
      { status: 502 }
    );
  }

  return refreshAuthCookie(request, NextResponse.json(buildHistory(days)));
}
