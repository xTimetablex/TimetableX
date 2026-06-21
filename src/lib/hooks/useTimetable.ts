'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AuthIdentity,
  FilterMode,
  TimetableResponse,
  ViewMode,
} from '@/lib/types';
import { useBlacklist } from './useBlacklist';
import { track } from '@/lib/analytics';
import { filterEntries } from '@/lib/filterEntries';

export { filterEntries };

const FETCH_KEY = 'timetable';

function getAvailableValues(
  data: TimetableResponse | undefined,
  filterMode: FilterMode
): string[] {
  if (!data) return [];
  if (filterMode === 'class') return data.availableClasses;
  if (filterMode === 'room') return data.availableRooms;
  return data.availableTeachers;
}

export function computeIsSelectionAvailable(
  data: TimetableResponse | undefined,
  filterMode: FilterMode,
  selectedValue: string
): boolean {
  if (!selectedValue || !data) return true;
  return getAvailableValues(data, filterMode).includes(selectedValue);
}

export function useTimetable(
  creds: AuthIdentity | null,
  date?: string,
  view: ViewMode = 'day'
) {
  const [filterMode, setFilterModeRaw] = useState<FilterMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('filterMode') as FilterMode) || 'class';
    }
    return 'class';
  });

  const [selectedValue, setSelectedValue] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('filterValue') || '';
    }
    return '';
  });

  const { data, error, isLoading, isFetching, refetch } = useQuery<TimetableResponse, Error>({
    queryKey: [FETCH_KEY, creds?.school, creds?.user, date, view],
    queryFn: async () => {
      if (!creds) throw new Error('No session');

      const res = await fetch('/api/stundenplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, view }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Fehler beim Laden der Daten.');
      return json;
    },
    enabled: !!creds,
  });

  const { currentBlacklist, addToBlacklist, removeFromBlacklist } = useBlacklist(selectedValue);

  const setFilterMode = useCallback((mode: FilterMode) => {
    setFilterModeRaw(mode);
    setSelectedValue('');
  }, []);

  useEffect(() => {
    if (error) track('timetable_fetch_error', { message: error.message });
  }, [error]);

  useEffect(() => {
    if (!data) return;

    const options = getAvailableValues(data, filterMode);
    if (options.length === 0) {
      // No classes available for this day (e.g. weekend or holiday).
      // Keep the user's selection so it survives empty-plan days — the UI
      // shows the "Wochenende"/"Kein Unterricht" empty state instead of
      // resetting the chosen class back to the '—' placeholder.
      return;
    }

    if (!selectedValue || !options.includes(selectedValue)) {
      setSelectedValue(options[0]);
    }
  }, [data, filterMode, selectedValue]);

  useEffect(() => {
    if (filterMode) localStorage.setItem('filterMode', filterMode);
    if (selectedValue) localStorage.setItem('filterValue', selectedValue);
  }, [filterMode, selectedValue]);

  const isSelectionAvailable = useMemo(
    () => computeIsSelectionAvailable(data, filterMode, selectedValue),
    [data, filterMode, selectedValue]
  );

  const filteredEntries = useMemo(() => {
    if (!data || !('entries' in data)) return [];
    return filterEntries(data.entries, filterMode, selectedValue, currentBlacklist);
  }, [data, filterMode, selectedValue, currentBlacklist]);

  const filteredDays = useMemo(() => {
    if (!data || !('days' in data)) return [];
    return data.days.map(day => ({
      ...day,
      filteredEntries: filterEntries(day.entries, filterMode, selectedValue, currentBlacklist),
      isSelectionAvailable: computeIsSelectionAvailable(day, filterMode, selectedValue),
    }));
  }, [data, filterMode, selectedValue, currentBlacklist]);

  return {
    data,
    error,
    isLoading: isLoading || isFetching,
    filteredEntries,
    filterMode,
    setFilterMode,
    selectedValue,
    setSelectedValue,
    refetch,
    currentBlacklist,
    addToBlacklist,
    removeFromBlacklist,
    filteredDays,
    isSelectionAvailable,
  };
}
