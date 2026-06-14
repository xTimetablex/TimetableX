'use client';

import { useQuery } from '@tanstack/react-query';
import { AuthIdentity, TimetableWeekData } from '@/lib/types';
import { addDays, formatDateStr, getWeekStart } from '@/lib/date';

const CACHE_TTL = 24 * 60 * 60 * 1000;
const WEEKS_TO_LOOK_BACK = 2;

interface ExtendedEntitiesCache {
  classes: string[];
  rooms: string[];
  teachers: string[];
  cachedAt: number;
}

interface ExtendedEntities {
  classes: string[];
  rooms: string[];
  teachers: string[];
}

function getRecentWeekStartStrs(): string[] {
  const today = new Date();
  return Array.from({ length: WEEKS_TO_LOOK_BACK }, (_, index) =>
    formatDateStr(getWeekStart(addDays(today, -7 * (index + 1))))
  );
}

function getCacheKey(creds: AuthIdentity): string {
  return `extended_entities_${creds.school}`;
}

function loadCache(creds: AuthIdentity): ExtendedEntitiesCache | null {
  try {
    const raw = localStorage.getItem(getCacheKey(creds));
    if (!raw) return null;
    const parsed: ExtendedEntitiesCache = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.classes) ||
      !Array.isArray(parsed.rooms) ||
      !Array.isArray(parsed.teachers) ||
      typeof parsed.cachedAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() - parsed.cachedAt > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(
  creds: AuthIdentity,
  classes: string[],
  rooms: string[],
  teachers: string[]
): void {
  const cache: ExtendedEntitiesCache = {
    classes,
    rooms,
    teachers,
    cachedAt: Date.now(),
  };
  localStorage.setItem(getCacheKey(creds), JSON.stringify(cache));
}

async function loadExtendedEntities(creds: AuthIdentity): Promise<ExtendedEntities> {
  const cached = loadCache(creds);
  if (cached) {
    return { classes: cached.classes, rooms: cached.rooms, teachers: cached.teachers };
  }

  const classes = new Set<string>();
  const rooms = new Set<string>();
  const teachers = new Set<string>();

  const weeks = await Promise.all(
    getRecentWeekStartStrs().map(async date => {
      const res = await fetch('/api/stundenplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, view: 'week' }),
      });

      if (!res.ok) return null;
      return (await res.json()) as TimetableWeekData;
    })
  );

  weeks.forEach(week => {
    if (!week) return;
    week.availableClasses.forEach(value => classes.add(value));
    week.availableRooms.forEach(value => rooms.add(value));
    week.availableTeachers.forEach(value => teachers.add(value));
  });

  const classList = Array.from(classes).sort();
  const roomList = Array.from(rooms).sort();
  const teacherList = Array.from(teachers).sort();
  saveCache(creds, classList, roomList, teacherList);

  return { classes: classList, rooms: roomList, teachers: teacherList };
}

export function useExtendedEntities(creds: AuthIdentity | null) {
  const { data } = useQuery<ExtendedEntities>({
    queryKey: ['extendedEntities', creds?.school, creds?.user],
    queryFn: () => {
      if (!creds) throw new Error('No session');
      return loadExtendedEntities(creds);
    },
    enabled: !!creds,
    staleTime: CACHE_TTL,
  });

  return {
    extendedClasses: data?.classes ?? [],
    extendedRooms: data?.rooms ?? [],
    extendedTeachers: data?.teachers ?? [],
  };
}
