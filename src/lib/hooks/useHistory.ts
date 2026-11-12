'use client';

import { useQuery } from '@tanstack/react-query';
import { AuthIdentity } from '@/lib/types';
import { TimetableHistory } from '@/lib/history';
import { historyQueryKey, TimetableRequestError } from '@/lib/timetableQuery';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STALE_TIME_MS = 6 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'timetable_history_';
/** Written by earlier versions (entities only). */
const LEGACY_STORAGE_PREFIX = 'extended_entities_';

interface StoredHistory {
  data: TimetableHistory;
  cachedAt: number;
}

function storageKey(identity: AuthIdentity): string {
  return `${STORAGE_PREFIX}${identity.school}`;
}

function isHistory(value: any): value is TimetableHistory {
  return (
    !!value &&
    Array.isArray(value.classes) &&
    Array.isArray(value.rooms) &&
    Array.isArray(value.teachers) &&
    !!value.subjects &&
    typeof value.subjects === 'object'
  );
}

function loadStoredHistory(identity: AuthIdentity): StoredHistory | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(identity)) ?? 'null');
    if (!parsed || typeof parsed.cachedAt !== 'number' || !isHistory(parsed.data)) return undefined;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function storeHistory(identity: AuthIdentity, data: TimetableHistory): void {
  try {
    const value: StoredHistory = { data, cachedAt: Date.now() };
    localStorage.setItem(storageKey(identity), JSON.stringify(value));
  } catch {
    // Storage full or blocked: the in-memory query cache still works.
  }
}

/** Removes the stored history of every school (used on logout). */
export function clearStoredHistory(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(STORAGE_PREFIX) || key.startsWith(LEGACY_STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/**
 * Classes/rooms/teachers and per-entity subjects from the last two school
 * weeks. Kept on the device for a day so the picker is complete right away,
 * and only fetched when `enabled` (the picker or subject dialog is open, or
 * the app has been idle for a moment), so it never competes with the plan.
 */
export function useHistory(identity: AuthIdentity, enabled: boolean) {
  return useQuery<TimetableHistory, Error>({
    queryKey: historyQueryKey(identity),
    queryFn: async () => {
      const res = await fetch('/api/history', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new TimetableRequestError(json.error || 'Fehler beim Laden der letzten Pläne.', res.status);
      }
      storeHistory(identity, json);
      return json;
    },
    initialData: () => loadStoredHistory(identity)?.data,
    initialDataUpdatedAt: () => loadStoredHistory(identity)?.cachedAt,
    staleTime: STALE_TIME_MS,
    enabled,
    retry: 1,
  });
}
