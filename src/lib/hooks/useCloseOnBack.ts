'use client';

import { useEffect, useEffectEvent } from 'react';

const STATE_KEY = '__ttxModal';
let openModals = 0;

/**
 * Lets the (Android/browser) back button close a dialog instead of leaving
 * the page: opening pushes a history entry, "back" pops it and closes the
 * dialog, and closing it any other way removes the entry again.
 *
 * The entry is removed in a timeout and only when no dialog is open by then,
 * which keeps StrictMode's mount/unmount/mount from closing it right away.
 */
export function useCloseOnBack(isOpen: boolean, onClose: () => void) {
  const onCloseEvent = useEffectEvent(onClose);

  useEffect(() => {
    if (!isOpen) return;

    openModals += 1;
    if (!window.history.state?.[STATE_KEY]) {
      // Next.js copies its own router state into this object (no URL change).
      window.history.pushState({ [STATE_KEY]: true }, '');
    }

    const handlePopState = () => onCloseEvent();
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      openModals -= 1;
      setTimeout(() => {
        if (openModals === 0 && window.history.state?.[STATE_KEY]) window.history.back();
      }, 0);
    };
  }, [isOpen]);
}
