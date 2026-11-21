'use client';

import { useEffect, useState } from 'react';

/** Turns (and stays) `true` once `ready` has been true for `delayMs`. */
export function useBecomesTrueAfter(ready: boolean, delayMs: number): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!ready || done) return;
    const id = setTimeout(() => setDone(true), delayMs);
    return () => clearTimeout(id);
  }, [ready, done, delayMs]);
  return done;
}
