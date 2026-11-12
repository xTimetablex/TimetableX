'use client';

import { useEffect, useEffectEvent } from 'react';

export interface AppShortcuts {
  /** Cmd/Ctrl+K: opens the picker, or closes it when it is open. */
  togglePicker: () => void;
  /** `/` */
  openPicker: () => void;
  /** ← / → */
  navigate: (offset: 1 | -1) => void;
  /** `t` */
  today: () => void;
  /** `d` / `w` */
  view: (mode: 'day' | 'week') => void;
  /** `r` */
  refresh: () => void;
}

/**
 * Global keyboard shortcuts. Single keys are ignored while a dialog is open
 * (`dialogOpen`) or while typing in a field.
 */
export function useAppShortcuts(shortcuts: AppShortcuts, dialogOpen: boolean) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      shortcuts.togglePicker();
      return;
    }

    if (dialogOpen) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

    const actions: Record<string, () => void> = {
      ArrowLeft: () => shortcuts.navigate(-1),
      ArrowRight: () => shortcuts.navigate(1),
      t: shortcuts.today,
      d: () => shortcuts.view('day'),
      w: () => shortcuts.view('week'),
      r: shortcuts.refresh,
      '/': () => {
        event.preventDefault();
        shortcuts.openPicker();
      },
    };
    if (Object.hasOwn(actions, event.key)) actions[event.key]();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
}
