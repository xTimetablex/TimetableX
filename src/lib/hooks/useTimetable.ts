'use client';

import { useEffect } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { AuthIdentity, TimetableData } from '@/lib/types';
import { track } from '@/lib/analytics';
import { shiftSchoolDay } from '@/lib/date';
import {
  dayQueryKey,
  dayStaleTime,
  isAuthError,
  isPastDateStr,
  TimetableRequestError,
} from '@/lib/timetableQuery';

async function fetchDay(dateStr: string): Promise<TimetableData> {
  const res = await fetch('/api/stundenplan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: dateStr }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new TimetableRequestError(json.error || 'Fehler beim Laden der Daten.', res.status);
  }
  return json as TimetableData;
}

export function dayQueryOptions(identity: AuthIdentity, dateStr: string) {
  const isPast = isPastDateStr(dateStr);
  return {
    queryKey: dayQueryKey(identity, dateStr),
    queryFn: () => fetchDay(dateStr),
    staleTime: dayStaleTime(dateStr),
    // Substitution plans change during the day: refetch when the app comes
    // back to the foreground (e.g. a PWA resumed the next morning).
    refetchOnWindowFocus: !isPast,
    retry: (failureCount: number, error: Error) => !isAuthError(error) && failureCount < 1,
  };
}

export interface DayResult {
  dateStr: string;
  data: TimetableData | undefined;
  error: Error | null;
  isPending: boolean;
}

/**
 * Loads each day of the view as its own query, so the day and week views
 * share one cache, the week fills in day by day, and one failing day doesn't
 * hide the other four.
 */
export function useTimetableDays(identity: AuthIdentity, dates: string[]) {
  const results = useQueries({
    queries: dates.map(dateStr => dayQueryOptions(identity, dateStr)),
  });

  const days: DayResult[] = results.map((result, index) => ({
    dateStr: dates[index],
    data: result.data,
    error: result.error,
    isPending: result.isPending,
  }));

  const errors = results.map(result => result.error).filter((e): e is Error => !!e);
  const firstErrorMessage = errors[0]?.message;

  useEffect(() => {
    if (firstErrorMessage) track('timetable_fetch_error', { message: firstErrorMessage });
  }, [firstErrorMessage]);

  return {
    days,
    isFetching: results.some(result => result.isFetching),
    authError: errors.find(isAuthError) ?? null,
    /** Set only when every day failed, i.e. there is nothing to show. */
    fatalError: errors.length === results.length && errors.length > 0 ? errors[0] : null,
    refetch: () => Promise.all(results.map(result => result.refetch())),
  };
}

/** Loads the previous and next school day in the background, so ← and → are instant. */
export function usePrefetchNeighbours(identity: AuthIdentity, dateStr: string, enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(() => {
      for (const offset of [1, -1]) {
        void queryClient.prefetchQuery(dayQueryOptions(identity, shiftSchoolDay(dateStr, offset)));
      }
    }, 300);
    return () => clearTimeout(id);
  }, [enabled, identity, dateStr, queryClient]);
}
