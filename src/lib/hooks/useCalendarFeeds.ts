'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarEntityType } from '@/lib/types';
import { track } from '@/lib/analytics';

export interface CalendarFeed {
  token: string;
  entityType: CalendarEntityType;
  entityValue: string;
  icsUrl: string;
}

export function useCalendarFeeds() {
  const [feeds, setFeeds] = useState<CalendarFeed[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/calendar/feeds', { cache: 'no-store' });
    if (!res.ok) {
      setFeeds([]);
      return;
    }
    const { feeds: list } = await res.json();
    setFeeds(list as CalendarFeed[]);
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoaded(true));
  }, [refresh]);

  const add = useCallback(async (entityType: CalendarEntityType, entityValue: string) => {
    setIsBusy(true);
    try {
      const res = await fetch('/api/calendar/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityValue }),
      });
      if (!res.ok) throw new Error('Kalender konnte nicht aktiviert werden.');

      const feed = (await res.json()) as CalendarFeed;
      setFeeds(prev =>
        prev.some(f => f.token === feed.token) ? prev : [...prev, feed]
      );
      track('calendar_feed_added', { entity_type: entityType });
    } finally {
      setIsBusy(false);
    }
  }, []);

  const remove = useCallback(async (token: string) => {
    setIsBusy(true);
    try {
      await fetch('/api/calendar/feeds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => undefined);

      setFeeds(prev => prev.filter(f => f.token !== token));
      track('calendar_feed_removed');
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { feeds, isBusy, isLoaded, add, remove };
}
