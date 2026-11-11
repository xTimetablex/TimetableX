'use client';

import { createContext, useContext } from 'react';

/** Reopens the cookie banner so the user can change their analytics choice. */
export const ConsentSettingsContext = createContext<() => void>(() => {});

export function useOpenConsentSettings() {
  return useContext(ConsentSettingsContext);
}
