import { addDays, formatDateStr, isWeekendDate, parseDateStr } from './date';
import { sortNatural } from './dayState';
import { FilterMode, TimetableData } from './types';

/** How many school days `/api/history` looks back (today included). */
export const HISTORY_SCHOOL_DAYS = 10;

/**
 * Everything the app learns from the recent plans: all classes, rooms and
 * teachers (so the picker also finds ones missing from today's plan) and the
 * subjects each of them had (for the "hide subjects" dialog).
 */
export interface TimetableHistory {
  classes: string[];
  rooms: string[];
  teachers: string[];
  /** Keyed by `entityKey(mode, value)`. */
  subjects: Record<string, string[]>;
}

export function entityKey(mode: FilterMode, value: string): string {
  return `${mode}:${value}`;
}

/** The last `count` weekdays up to and including `todayStr`, newest first. */
export function getRecentSchoolDays(count: number, todayStr: string): string[] {
  const dates: string[] = [];
  let date = parseDateStr(todayStr);
  while (dates.length < count) {
    if (!isWeekendDate(date)) dates.push(formatDateStr(date));
    date = addDays(date, -1);
  }
  return dates;
}

export function buildHistory(days: TimetableData[]): TimetableHistory {
  const classes = new Set<string>();
  const rooms = new Set<string>();
  const teachers = new Set<string>();
  const subjects = new Map<string, Set<string>>();

  const addSubject = (mode: FilterMode, value: string, subject: string) => {
    if (!value || value === '---') return;
    const key = entityKey(mode, value);
    let set = subjects.get(key);
    if (!set) subjects.set(key, (set = new Set()));
    set.add(subject);
  };

  for (const day of days) {
    day.availableClasses.forEach(value => classes.add(value));
    day.availableRooms.forEach(value => rooms.add(value));
    day.availableTeachers.forEach(value => teachers.add(value));

    for (const entry of day.entries) {
      if (!entry.subject || entry.subject === '---') continue;
      addSubject('class', entry.class, entry.subject);
      addSubject('room', entry.room, entry.subject);
      addSubject('teacher', entry.teacher, entry.subject);
    }
  }

  return {
    classes: sortNatural(classes),
    rooms: sortNatural(rooms),
    teachers: sortNatural(teachers),
    subjects: Object.fromEntries(
      Array.from(subjects, ([key, set]) => [key, sortNatural(set)])
    ),
  };
}
