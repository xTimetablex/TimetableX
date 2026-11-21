'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDefaultDateStr, getTodayStr, isValidDateStr } from '@/lib/date';
import { ViewMode } from '@/lib/types';

/** After this long in the background, the app jumps back to the default day. */
const RESET_AFTER_HIDDEN_MS = 2 * 60 * 60 * 1000;

export type Navigate = (next: { date?: string | null; view?: ViewMode }) => void;

/**
 * The visible day and view, read from `?date=` and `?view=`, plus "today".
 * Without `?date` the app shows the default day (today, or the next school
 * day on weekends and in the evening).
 */
export function useViewState(initialDefaultDateStr: string, initialTodayStr: string) {
  const searchParams = useSearchParams();
  const [defaultDateStr, setDefaultDateStr] = useState(initialDefaultDateStr);
  const [todayStr, setTodayStr] = useState(initialTodayStr);

  const urlDate = searchParams.get('date');
  const viewMode: ViewMode = searchParams.get('view') === 'week' ? 'week' : 'day';
  const dateStr = isValidDateStr(urlDate) ? urlDate : defaultDateStr;

  // URL changes go through the History API: Next.js keeps useSearchParams in
  // sync without a server round trip, and replacing (not pushing) keeps the
  // back button from walking through every day you looked at.
  const navigate = useCallback<Navigate>(next => {
    const params = new URLSearchParams(window.location.search);
    params.delete('step'); // from the old two-step flow
    if (next.date === null) params.delete('date');
    else if (next.date) params.set('date', next.date);
    if (next.view === 'week') params.set('view', 'week');
    else if (next.view === 'day') params.delete('view');
    const query = params.toString();
    window.history.replaceState(null, '', query ? `/app?${query}` : '/app');
  }, []);

  // Keep "today" current in long-running sessions, and after a long break
  // (a PWA resumed the next morning) go back to the day that matters now.
  useEffect(() => {
    let hiddenAt: number | null = null;

    const refreshClock = () => {
      setTodayStr(getTodayStr());
      setDefaultDateStr(getDefaultDateStr());
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      refreshClock();
      if (hiddenAt !== null && Date.now() - hiddenAt > RESET_AFTER_HIDDEN_MS) {
        navigate({ date: null });
      }
      hiddenAt = null;
    };

    const interval = setInterval(refreshClock, 60_000);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [navigate]);

  return { dateStr, viewMode, todayStr, navigate };
}
