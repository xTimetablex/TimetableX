/*
 * Query keys and options shared by the client hooks and the server-side
 * prefetch in `src/app/app/page.tsx`. Keep this module free of 'use client' and
 * of server-only imports: both sides must build identical keys, or the
 * prefetched data is never picked up.
 */
import { formatDateStr, getSchoolWeekDates, getTodayStr, parseDateStr } from './date';
import { AuthIdentity, ViewMode } from './types';

/** A failed `/api/*` request, with the HTTP status the server answered. */
export class TimetableRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'TimetableRequestError';
  }
}

/**
 * Throws a `TimetableRequestError` for a non-OK response, using the `error`
 * message our API routes send (or `fallback` if the body has none). Call it
 * before reading the body of a successful response.
 */
export async function assertOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const body: { error?: unknown } = await res.json().catch(() => ({}));
  const message = typeof body.error === 'string' && body.error ? body.error : fallback;
  throw new TimetableRequestError(message, res.status);
}

export function isAuthError(error: unknown): boolean {
  return error instanceof TimetableRequestError && error.status === 401;
}

export function dayQueryKey(identity: AuthIdentity, dateStr: string) {
  return ['day', identity.school, identity.user, dateStr] as const;
}

export function historyQueryKey(identity: AuthIdentity) {
  return ['history', identity.school, identity.user] as const;
}

/** Plans of past days don't change any more; today's and future ones do. */
export const FRESH_STALE_TIME_MS = 60_000;

export function isPastDateStr(dateStr: string, todayStr = getTodayStr()): boolean {
  return dateStr < todayStr;
}

export function dayStaleTime(dateStr: string): number {
  return isPastDateStr(dateStr) ? Infinity : FRESH_STALE_TIME_MS;
}

/** The days a view shows: the day itself, or Monday–Friday of its school week. */
export function getViewDates(dateStr: string, view: ViewMode): string[] {
  if (view === 'day') return [dateStr];
  return getSchoolWeekDates(parseDateStr(dateStr)).map(formatDateStr);
}
