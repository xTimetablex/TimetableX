import { createHash } from 'crypto';
import { parseStringPromise } from 'xml2js';
import {
  formatDateStr,
  formatDayLabel,
  formatWeekLabel,
  getTodayStr,
  getWeekDates,
  isWeekendDate,
  parseDateStr,
} from './date';
import { TimetableData, TimetableDayData, TimetableEntry, TimetableWeekData } from './types';

const FALLBACK_VALUE = '---';

/** Upstream requests that hang longer than this count as "unreachable". */
const UPSTREAM_TIMEOUT_MS = 10_000;

/** stundenplan24 rejected the credentials (HTTP 401). */
export class TimetableAuthError extends Error {
  constructor() {
    super('Ungültiger Benutzername oder Passwort.');
    this.name = 'TimetableAuthError';
  }
}

/** stundenplan24 could not be reached or answered with a server error. */
export class TimetableUnavailableError extends Error {
  constructor(message = 'Verbindung zum Server fehlgeschlagen.', options?: ErrorOptions) {
    super(message, options);
    this.name = 'TimetableUnavailableError';
  }
}

/**
 * HTTP status for an error thrown while loading a plan. Matches the error
 * classes first and falls back to the German messages for anything else.
 */
export function getTimetableErrorStatus(error: unknown): 401 | 502 | 500 {
  if (error instanceof TimetableAuthError) return 401;
  if (error instanceof TimetableUnavailableError) return 502;

  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Ungültig')) return 401;
  if (message.includes('Verbindung')) return 502;
  return 500;
}

function isDemoSchool(school: string): boolean {
  return school === 'sample' || school === 'demo';
}

function cleanValue(val: any): string {
  const actualVal = typeof val === 'string' ? val : (val?._ || '');
  if (!actualVal || actualVal === '&nbsp;' || actualVal.trim() === '' || actualVal === FALLBACK_VALUE) {
    return FALLBACK_VALUE;
  }
  return actualVal.trim();
}

/**
 * Checks if a value object from xml2js has an "Ae" (Aenderung/Change) attribute.
 * E.g. std.Ra[0].$.RaAe === 'RaGeaendert'
 */
function hasChangeFlag(val: any, attrName: string): boolean {
  return typeof val === 'object' && !!val?.$?.[attrName];
}

const SAMPLE_DATA: TimetableData = {
  title: 'Beispiel Stundenplan',
  date: 'Montag, 30. März 2026',
  updatedAt: 'Beispieldaten',
  entries: [
    {
      class: '5/1',
      hour: '1',
      subject: 'MA',
      teacher: 'KNO',
      room: '313',
      info: '---'
    },
    {
      class: '5/1',
      hour: '2',
      subject: 'DE',
      teacher: 'MEY',
      room: '311',
      info: 'Vertretung für AUE',
      teacherChanged: true
    },
    {
      class: '5/1',
      hour: '3',
      subject: 'EN',
      teacher: 'STZ',
      room: 'E204',
      info: 'Raumänderung: Zimmer E204',
      roomChanged: true
    },
    {
      class: '9/2',
      hour: '4',
      subject: 'CH',
      teacher: 'HIN',
      room: '328',
      info: 'Klassenänderung: Kurs 9/2+9/3'
    },
    {
      class: '10/1',
      hour: '5',
      subject: 'SPO',
      teacher: '---',
      room: '---',
      info: 'Sport fällt aus'
    }
  ],
  availableClasses: ['10/1', '5/1', '9/2'],
  availableRooms: ['311', '313', '328', 'E204'],
  availableTeachers: ['HIN', 'KNO', 'MEY', 'STZ'],
  currentDateStr: '20260330'
};

function getSampleDay(dateStr: string): TimetableData {
  return {
    ...SAMPLE_DATA,
    date: formatDayLabel(parseDateStr(dateStr)),
    currentDateStr: dateStr,
  };
}

function emptyDay(dateStr: string): TimetableData {
  return {
    title: 'Stundenplan',
    date: formatDayLabel(parseDateStr(dateStr)),
    entries: [],
    availableClasses: [],
    availableRooms: [],
    availableTeachers: [],
    currentDateStr: dateStr,
    isWeekend: isWeekendDate(parseDateStr(dateStr)),
  };
}

async function fetchDayFromUpstream(
  school: string,
  user: string,
  pass: string,
  dateStr: string
): Promise<TimetableData> {
  const url = `https://www.stundenplan24.de/${school}/wplan/wdatenk/WPlanKl_${dateStr}.xml`;
  const credentials = Buffer.from(`${user}:${pass}`).toString('base64');

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'Authorization': `Basic ${credentials}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    throw new TimetableUnavailableError('Verbindung zum Server fehlgeschlagen.', { cause: error });
  }

  if (response.status === 401) {
    throw new TimetableAuthError();
  }

  // 404 is how stundenplan24 says "no plan published for this day". Anything
  // else (5xx, 403, …) is a real failure and must not look like a day off.
  if (response.status === 404) {
    return emptyDay(dateStr);
  }

  if (!response.ok) {
    throw new TimetableUnavailableError(
      `Verbindung zu stundenplan24 fehlgeschlagen (HTTP ${response.status}).`
    );
  }

  const xml = await response.text();
  const result = await parseStringPromise(xml);

  const kopf = result.WplanVp?.Kopf?.[0] || {};
  const datum = cleanValue(kopf.DatumPlan?.[0]);
  const zeitstempel = cleanValue(kopf.zeitstempel?.[0]);

  const dayNotes: string[] = [];

  // Extract notes from ZusatzInfo and FreieTexte
  const zusatzInfoLines = result.WplanVp?.ZusatzInfo?.[0]?.ZiZeile || [];
  const freieTexte = result.WplanVp?.FreieTexte?.[0]?.Ft || [];

  [...zusatzInfoLines, ...freieTexte].forEach(line => {
    const text = cleanValue(line);
    if (text !== FALLBACK_VALUE && !dayNotes.includes(text)) {
      dayNotes.push(text);
    }
  });

  const entries: TimetableEntry[] = [];
  const classSet = new Set<string>();
  const roomSet = new Set<string>();
  const teacherSet = new Set<string>();

  const klassen = result.WplanVp?.Klassen?.[0]?.Kl || [];

  for (const kl of klassen) {
    const className = cleanValue(kl.Kurz?.[0]);
    if (className !== FALLBACK_VALUE) classSet.add(className);

    const stunden = kl.Pl?.[0]?.Std || [];

    for (const std of stunden) {
      const entry: TimetableEntry = {
        class: className,
        hour: cleanValue(std.St?.[0]),
        subject: cleanValue(std.Fa?.[0]),
        teacher: cleanValue(std.Le?.[0]),
        room: cleanValue(std.Ra?.[0]),
        info: cleanValue(std.If?.[0]),
        // Flags from XML attributes
        hourChanged: hasChangeFlag(std.St?.[0], 'StAe'),
        subjectChanged: hasChangeFlag(std.Fa?.[0], 'FaAe'),
        teacherChanged: hasChangeFlag(std.Le?.[0], 'LeAe'),
        roomChanged: hasChangeFlag(std.Ra?.[0], 'RaAe'),
      };

      entries.push(entry);
      if (entry.room !== FALLBACK_VALUE) roomSet.add(entry.room);
      if (entry.teacher !== FALLBACK_VALUE) teacherSet.add(entry.teacher);
    }
  }

  return {
    title: 'Stundenplan',
    date: datum !== FALLBACK_VALUE ? datum : formatDayLabel(parseDateStr(dateStr)),
    ...(zeitstempel !== FALLBACK_VALUE ? { updatedAt: zeitstempel } : {}),
    entries,
    availableClasses: Array.from(classSet).sort(),
    availableRooms: Array.from(roomSet).sort(),
    availableTeachers: Array.from(teacherSet).sort(),
    currentDateStr: dateStr,
    dayNotes: dayNotes.length > 0 ? dayNotes : undefined,
  };
}

/*
 * Short-lived in-memory cache of upstream plans. Every visitor of a school
 * asks for the same few XML files, and the app itself asks for neighbouring
 * days and the recent history. Entries are keyed by the full credentials (the
 * password only as a hash), so a cached plan is only ever returned to someone
 * whose credentials already worked for it. Concurrent requests share one fetch.
 */
const FRESH_TTL_MS = 60_000;
const PAST_TTL_MS = 6 * 60 * 60_000;
const CACHE_MAX_ENTRIES = 500;

const dayCache = new Map<string, { expires: number; value: Promise<TimetableData> }>();

function cacheKey(school: string, user: string, pass: string, dateStr: string): string {
  const passHash = createHash('sha256').update(pass).digest('base64url');
  return [school, user, passHash, dateStr].join('\u0000');
}

/** Test helper: drops all cached plans. */
export function clearTimetableCache(): void {
  dayCache.clear();
}

function fetchDayCached(
  school: string,
  user: string,
  pass: string,
  dateStr: string
): Promise<TimetableData> {
  const key = cacheKey(school, user, pass, dateStr);
  const now = Date.now();
  const hit = dayCache.get(key);
  if (hit && hit.expires > now) return hit.value;
  if (hit) dayCache.delete(key);

  const value = fetchDayFromUpstream(school, user, pass, dateStr);
  const ttl = dateStr < getTodayStr() ? PAST_TTL_MS : FRESH_TTL_MS;
  dayCache.set(key, { expires: now + ttl, value });

  // Never cache failures: the next request should try again.
  value.catch(() => {
    if (dayCache.get(key)?.value === value) dayCache.delete(key);
  });

  if (dayCache.size > CACHE_MAX_ENTRIES) {
    const oldest = dayCache.keys().next().value;
    if (oldest !== undefined) dayCache.delete(oldest);
  }

  return value;
}

export async function fetchStundenplan(
  school: string,
  user: string,
  pass: string,
  dateStr?: string
): Promise<TimetableData> {
  const targetDateStr = dateStr ?? getTodayStr();
  if (isDemoSchool(school)) return getSampleDay(targetDateStr);
  return fetchDayCached(school, user, pass, targetDateStr);
}

export async function fetchWeekStundenplan(
  school: string,
  user: string,
  pass: string,
  dateStr?: string
): Promise<TimetableWeekData> {
  const anchorDate = parseDateStr(dateStr ?? getTodayStr());
  const weekDates = getWeekDates(anchorDate);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];
  const weekDateStrs = weekDates.map(formatDateStr);

  const settled = await Promise.allSettled(
    weekDateStrs.map(date => fetchStundenplan(school, user, pass, date))
  );

  const failures = settled.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
  const authFailure = failures.find(result => getTimetableErrorStatus(result.reason) === 401);
  if (authFailure) throw authFailure.reason;
  if (failures.length > 0) throw failures[0].reason;

  const days: TimetableDayData[] = settled.map(result => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });

  const availableClasses = new Set<string>();
  const availableRooms = new Set<string>();
  const availableTeachers = new Set<string>();

  days.forEach(day => {
    day.availableClasses.forEach(value => availableClasses.add(value));
    day.availableRooms.forEach(value => availableRooms.add(value));
    day.availableTeachers.forEach(value => availableTeachers.add(value));
  });

  return {
    title: 'Stundenplan',
    date: formatWeekLabel(weekStart, weekEnd),
    currentDateStr: formatDateStr(anchorDate),
    weekStartStr: formatDateStr(weekStart),
    days,
    availableClasses: Array.from(availableClasses).sort(),
    availableRooms: Array.from(availableRooms).sort(),
    availableTeachers: Array.from(availableTeachers).sort(),
  };
}
