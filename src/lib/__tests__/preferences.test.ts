// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPreferences,
  getPreferences,
  MAX_FAVORITES,
  resetPreferencesForTests,
  setSelection,
  toggleBlacklistedSubject,
  toggleFavorite,
} from '../preferences';

describe('preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    resetPreferencesForTests();
  });

  it('reads the keys earlier versions wrote', () => {
    localStorage.setItem('filterMode', 'teacher');
    localStorage.setItem('filterValue', 'KNO');
    localStorage.setItem('favorites', JSON.stringify([{ mode: 'class', value: '5/1' }]));
    localStorage.setItem('timetable_blacklist', JSON.stringify({ KNO: ['REL'] }));

    expect(getPreferences()).toEqual({
      selection: { mode: 'teacher', value: 'KNO' },
      favorites: [{ mode: 'class', value: '5/1' }],
      blacklist: { KNO: ['REL'] },
    });
  });

  it('ignores corrupt or invalid stored values', () => {
    localStorage.setItem('filterMode', 'banana');
    localStorage.setItem('filterValue', '5/1');
    localStorage.setItem('favorites', '{not json');
    localStorage.setItem('timetable_blacklist', JSON.stringify({ '5/1': 'REL', '6/2': [1, 'DE'] }));

    expect(getPreferences()).toEqual({ selection: null, favorites: [], blacklist: { '6/2': ['DE'] } });
  });

  it('persists the selection', () => {
    setSelection({ mode: 'room', value: '313' });
    expect(localStorage.getItem('filterMode')).toBe('room');
    expect(localStorage.getItem('filterValue')).toBe('313');
  });

  it('limits favorites without blocking the UI', () => {
    for (let i = 0; i < MAX_FAVORITES; i++) {
      expect(toggleFavorite({ mode: 'class', value: `${i}/1` })).toBe('added');
    }
    expect(toggleFavorite({ mode: 'class', value: '9/9' })).toBe('limit');
    expect(getPreferences().favorites).toHaveLength(MAX_FAVORITES);

    expect(toggleFavorite({ mode: 'class', value: '0/1' })).toBe('removed');
    expect(getPreferences().favorites).toHaveLength(MAX_FAVORITES - 1);
  });

  it('toggles hidden subjects and drops empty entries', () => {
    expect(toggleBlacklistedSubject('5/1', 'REL')).toBe('added');
    expect(JSON.parse(localStorage.getItem('timetable_blacklist')!)).toEqual({ '5/1': ['REL'] });

    expect(toggleBlacklistedSubject('5/1', 'REL')).toBe('removed');
    expect(localStorage.getItem('timetable_blacklist')).toBeNull();
  });

  it('clears everything on logout', () => {
    setSelection({ mode: 'class', value: '5/1' });
    toggleFavorite({ mode: 'class', value: '5/1' });
    toggleBlacklistedSubject('5/1', 'REL');

    clearPreferences();

    expect(getPreferences()).toEqual({ selection: null, favorites: [], blacklist: {} });
    expect(localStorage.length).toBe(0);
  });
});
