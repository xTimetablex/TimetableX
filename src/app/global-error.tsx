'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import './globals.css';

// Last-resort error boundary: replaces the root layout when rendering crashes.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="de">
      <body className="antialiased">
        <main className="app-shell edge-shell flex min-h-[100dvh] items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
              Etwas ist schiefgelaufen.
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Der Fehler wurde automatisch gemeldet. Bitte versuche es erneut.
            </p>
            <button type="button" onClick={reset} className="btn btn-primary text-sm">
              Neu laden
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
