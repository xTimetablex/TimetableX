'use client';

import { RefObject, useEffect, useEffectEvent } from 'react';

const MIN_DISTANCE_PX = 60;
const MAX_DURATION_MS = 600;

/**
 * Calls `onSwipe(1)` for a swipe to the left (next) and `onSwipe(-1)` for a
 * swipe to the right (previous). Only clearly horizontal, quick swipes count,
 * so vertical scrolling is never mistaken for navigation.
 */
export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  onSwipe: (direction: 1 | -1) => void,
  enabled = true
) {
  const onSwipeEvent = useEffectEvent(onSwipe);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let start: { x: number; y: number; time: number } | null = null;

    const handleStart = (event: TouchEvent) => {
      start = event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY, time: Date.now() }
        : null;
    };

    const handleEnd = (event: TouchEvent) => {
      if (!start) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const elapsed = Date.now() - start.time;
      start = null;

      if (elapsed > MAX_DURATION_MS) return;
      if (Math.abs(dx) < MIN_DISTANCE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      onSwipeEvent(dx < 0 ? 1 : -1);
    };

    const handleCancel = () => {
      start = null;
    };

    el.addEventListener('touchstart', handleStart, { passive: true });
    el.addEventListener('touchend', handleEnd, { passive: true });
    el.addEventListener('touchcancel', handleCancel, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleStart);
      el.removeEventListener('touchend', handleEnd);
      el.removeEventListener('touchcancel', handleCancel);
    };
  }, [ref, enabled]);
}
