'use client';

import { useSyncExternalStore } from 'react';
import { getPreferences, Preferences, subscribePreferences } from '@/lib/preferences';

const getServerSnapshot = () => null;

/** The stored preferences, or `null` during SSR and the hydration render. */
export function usePreferences(): Preferences | null {
  return useSyncExternalStore(subscribePreferences, getPreferences, getServerSnapshot);
}
