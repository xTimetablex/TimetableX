'use client';

import { useEffect } from 'react';
import { WebHaptics } from 'web-haptics';

const isMobilePointer = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0);

const isInteractive = (el: Element | null) => {
  if (!el) return false;
  const target = el.closest(
    'button, [role="button"], a[href], input[type="button"], input[type="submit"], input[type="reset"]'
  ) as HTMLElement | null;
  if (!target) return false;
  if ('disabled' in target && (target as HTMLButtonElement).disabled) return false;
  if (target.getAttribute('aria-disabled') === 'true') return false;
  return true;
};

/**
 * A short vibration when a control is tapped. Fires on `click`, not on
 * `pointerdown`, so starting a scroll on top of a button doesn't buzz.
 */
export default function HapticsProvider() {
  useEffect(() => {
    if (!isMobilePointer()) return;

    const haptics = new WebHaptics();
    // `click` events don't reliably say which pointer caused them (Safari
    // fires plain MouseEvents), so remember the type of the last pointerdown.
    let lastPointerType = '';

    const handlePointerDown = (event: PointerEvent) => {
      lastPointerType = event.pointerType;
    };

    const handleClick = (event: MouseEvent) => {
      if (lastPointerType !== 'touch') return;
      if (!isInteractive(event.target as Element | null)) return;
      haptics.trigger([{ duration: 8 }], { intensity: 1 });
    };

    document.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });
    document.addEventListener('click', handleClick, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('click', handleClick, { capture: true });
      haptics.destroy();
    };
  }, []);

  return null;
}
