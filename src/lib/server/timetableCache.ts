import { fetchWeekStundenplan } from '../stundenplan';
import { getCredentialsForSchool } from './accountStore';
import { addDays, formatDateStr, getWeekStart } from '../date';
import { Credentials, TimetableWeekData } from '../types';

const CALENDAR_WEEK_SPAN = 3;
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  week: TimetableWeekData;
  at: number;
}

const cache = new Map<string, CacheEntry>();

function isAuthFailure(reason: unknown): boolean {
  return reason instanceof Error && reason.message.includes('Ungültig');
}

function getCalendarWeekAnchors(anchorDate = new Date()): string[] {
  const weekStart = getWeekStart(anchorDate);
  return Array.from({ length: CALENDAR_WEEK_SPAN * 2 + 1 }, (_, index) =>
    formatDateStr(addDays(weekStart, (index - CALENDAR_WEEK_SPAN) * 7))
  );
}

async function fetchMergedWeek(
  credentials: Credentials,
  anchors: string[]
): Promise<TimetableWeekData> {
  const settledWeeks = await Promise.allSettled(
    anchors.map(dateStr =>
      fetchWeekStundenplan(credentials.school, credentials.user, credentials.pass, dateStr)
    )
  );

  const authFailure = settledWeeks.find(
    result => result.status === 'rejected' && isAuthFailure(result.reason)
  );
  if (authFailure && authFailure.status === 'rejected') {
    throw authFailure.reason;
  }

  const weeks = settledWeeks
    .filter(
      (result): result is PromiseFulfilledResult<TimetableWeekData> =>
        result.status === 'fulfilled'
    )
    .map(result => result.value);

  if (weeks.length === 0) {
    const firstFailure = settledWeeks.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    throw firstFailure ? firstFailure.reason : new Error('Stundenplan konnte nicht geladen werden.');
  }

  const allClasses = new Set<string>();
  const allRooms = new Set<string>();
  const allTeachers = new Set<string>();
  weeks.forEach(week => {
    week.availableClasses.forEach(value => allClasses.add(value));
    week.availableRooms.forEach(value => allRooms.add(value));
    week.availableTeachers.forEach(value => allTeachers.add(value));
  });

  return {
    ...weeks[0],
    days: weeks.flatMap(week => week.days),
    availableClasses: Array.from(allClasses).sort(),
    availableRooms: Array.from(allRooms).sort(),
    availableTeachers: Array.from(allTeachers).sort(),
  };
}

/**
 * Returns the merged 7-week window for a school, cached in-process for a short TTL so every
 * class/teacher feed for that school — and every repeated calendar-client pull — shares one
 * upstream fetch. Tries each school credential newest-first, skipping ones that fail auth.
 *
 * Scaling boundary: the cache is per-process. If the web tier is ever horizontally scaled,
 * replace this Map with a shared cache (e.g. Redis).
 */
export async function getSchoolWeek(school: string): Promise<TimetableWeekData> {
  const cached = cache.get(school);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.week;
  }

  const credsPool = getCredentialsForSchool(school);
  if (credsPool.length === 0) {
    throw new Error('Keine gültigen Anmeldedaten für diese Schule verfügbar.');
  }

  const anchors = getCalendarWeekAnchors();
  let lastError: unknown = null;

  for (const creds of credsPool) {
    try {
      const week = await fetchMergedWeek(creds, anchors);
      cache.set(school, { week, at: Date.now() });
      return week;
    } catch (error) {
      lastError = error;
      if (isAuthFailure(error)) continue;
      throw error;
    }
  }

  throw lastError ?? new Error('Stundenplan konnte nicht geladen werden.');
}
