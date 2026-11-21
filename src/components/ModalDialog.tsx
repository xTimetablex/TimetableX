'use client';

import { useEffectEvent, useLayoutEffect, useRef, type ReactNode } from 'react';

interface ModalDialogProps {
  onClose: () => void;
  /**
   * The element to focus when the dialog opens. Called after mounting, so it
   * may read browser APIs. Returning `null` focuses the dialog itself.
   */
  getInitialFocus?: () => HTMLElement | null;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  children: ReactNode;
}

/**
 * Native modal `<dialog>`: the browser traps focus, makes the page behind it
 * inert and turns Escape into a `cancel` event. Mount it to open it and
 * unmount it to close it; focus then returns to whatever opened it.
 */
export function ModalDialog({ onClose, getInitialFocus, children, ...aria }: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initialFocus = useEffectEvent(() => getInitialFocus?.() ?? null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // showModal() focuses the element marked `autofocus`. Without one it would
    // pick the first focusable child, which pops up the on-screen keyboard
    // when that is a text field.
    const target = initialFocus() ?? dialog;
    target.autofocus = true;
    dialog.showModal();
    target.focus({ preventScroll: true });

    return () => {
      target.autofocus = false;
      // This runs before React removes the <dialog>, while the page behind it
      // is still inert and can't take focus: leave the top layer first.
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      {...aria}
      // Escape: let the parent close (and unmount) the dialog instead.
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      // The browser may still close it directly (e.g. repeated Escape). The
      // event is async: ignore it once unmounted (the cleanup above closed it)
      // or when it is open again (StrictMode's effect re-run in dev).
      onClose={() => {
        if (dialogRef.current && !dialogRef.current.open) onClose();
      }}
      className="modal-dialog fixed inset-0 z-[100] m-0 h-full max-h-none w-full max-w-none items-start justify-center border-0 bg-transparent px-4 pt-[6vh] text-inherit outline-none open:flex sm:pt-[10vh]"
    >
      <div className="fixed inset-0 palette-backdrop" onClick={onClose} aria-hidden="true" />
      {children}
    </dialog>
  );
}
