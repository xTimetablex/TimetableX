'use client';

/** Short, non-blocking status message at the bottom of the screen. */
export default function Toast({ message }: { message: string | null }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}
