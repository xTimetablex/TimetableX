/*
 * The user's on-device preferences: current selection, favorites and hidden
 * subjects, persisted in localStorage under the keys earlier versions used.
 *
 * Implemented as a tiny external store (for `useSyncExternalStore`): the server
 * and the hydration render see `null` ("not loaded yet") so the markup matches,
 * and the real values arrive in the render right after hydration. Changes from
 * other tabs come in through the `storage` event.
 */
import { Favorite, FilterMode, Selection } from './types';

export const MAX_FAVORITES = 4;

const KEYS = {
  mode: 'filterMode',
  value: 'filterValue',
  favorites: 'favorites',
  blacklist: 'timetable_blacklist',
} as const;

const FILTER_MODES: readonly FilterMode[] = ['class', 'room', 'teacher'];

export interface Preferences {
  selection: Selection | null;
  favorites: Favorite[];
  /** Hidden subjects per selected value (e.g. `{ '5/1': ['REL'] }`). */
  blacklist: Record<string, string[]>;
}

function isFilterMode(value: unknown): value is FilterMode {
  return typeof value === 'string' && (FILTER_MODES as readonly string[]).includes(value);
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readPreferences(): Preferences {
  let selection: Selection | null = null;
  try {
    const mode = localStorage.getItem(KEYS.mode);
    const value = localStorage.getItem(KEYS.value);
    if (isFilterMode(mode) && value) selection = { mode, value };
  } catch {
    // Storage blocked (private mode, disabled site data): start empty.
  }

  const rawFavorites = readJson(KEYS.favorites);
  const favorites = Array.isArray(rawFavorites)
    ? rawFavorites
        .filter(
          (f): f is Favorite =>
            !!f && isFilterMode(f.mode) && typeof f.value === 'string' && f.value !== ''
        )
        .slice(0, MAX_FAVORITES)
    : [];

  const rawBlacklist = readJson(KEYS.blacklist);
  const blacklist: Record<string, string[]> = {};
  if (rawBlacklist && typeof rawBlacklist === 'object' && !Array.isArray(rawBlacklist)) {
    for (const [entity, subjects] of Object.entries(rawBlacklist)) {
      if (Array.isArray(subjects)) {
        const valid = subjects.filter((s): s is string => typeof s === 'string');
        if (valid.length > 0) blacklist[entity] = valid;
      }
    }
  }

  return { selection, favorites, blacklist };
}

function writePreferences(prefs: Preferences): void {
  try {
    if (prefs.selection) {
      localStorage.setItem(KEYS.mode, prefs.selection.mode);
      localStorage.setItem(KEYS.value, prefs.selection.value);
    } else {
      localStorage.removeItem(KEYS.mode);
      localStorage.removeItem(KEYS.value);
    }

    if (prefs.favorites.length > 0) {
      localStorage.setItem(KEYS.favorites, JSON.stringify(prefs.favorites));
    } else {
      localStorage.removeItem(KEYS.favorites);
    }

    if (Object.keys(prefs.blacklist).length > 0) {
      localStorage.setItem(KEYS.blacklist, JSON.stringify(prefs.blacklist));
    } else {
      localStorage.removeItem(KEYS.blacklist);
    }
  } catch {
    // Storage full or blocked: keep working with the in-memory snapshot.
  }
}

let snapshot: Preferences | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach(listener => listener());
}

function handleStorage(event: StorageEvent): void {
  const keys: readonly string[] = Object.values(KEYS);
  if (event.key !== null && !keys.includes(event.key)) return;
  snapshot = readPreferences();
  notify();
}

export function getPreferences(): Preferences {
  snapshot ??= readPreferences();
  return snapshot;
}

export function subscribePreferences(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener('storage', handleStorage);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', handleStorage);
  };
}

function update(change: (prefs: Preferences) => Preferences): void {
  snapshot = change(getPreferences());
  writePreferences(snapshot);
  notify();
}

export function setSelection(selection: Selection | null): void {
  update(prefs => ({ ...prefs, selection }));
}

export function isSameEntity(a: Favorite | null | undefined, b: Favorite | null | undefined): boolean {
  return !!a && !!b && a.mode === b.mode && a.value === b.value;
}

export type FavoriteToggleResult = 'added' | 'removed' | 'limit';

export function toggleFavorite(favorite: Favorite): FavoriteToggleResult {
  const { favorites } = getPreferences();
  if (favorites.some(f => isSameEntity(f, favorite))) {
    update(prefs => ({ ...prefs, favorites: prefs.favorites.filter(f => !isSameEntity(f, favorite)) }));
    return 'removed';
  }

  if (favorites.length >= MAX_FAVORITES) return 'limit';

  update(prefs => ({
    ...prefs,
    favorites: [...prefs.favorites, { mode: favorite.mode, value: favorite.value }],
  }));
  return 'added';
}

export function toggleBlacklistedSubject(entity: string, subject: string): 'added' | 'removed' {
  const current = getPreferences().blacklist[entity] ?? [];
  const isHidden = current.includes(subject);
  const next = isHidden ? current.filter(s => s !== subject) : [...current, subject];

  update(prefs => {
    const blacklist = { ...prefs.blacklist };
    if (next.length > 0) blacklist[entity] = next;
    else delete blacklist[entity];
    return { ...prefs, blacklist };
  });

  return isHidden ? 'removed' : 'added';
}

/** Forgets everything (used on logout, so the next person on a shared device starts clean). */
export function clearPreferences(): void {
  update(() => ({ selection: null, favorites: [], blacklist: {} }));
}

/** Test helper: forces the next read to come from storage again. */
export function resetPreferencesForTests(): void {
  snapshot = null;
  listeners.clear();
}
