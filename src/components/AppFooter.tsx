'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { AuthIdentity } from '@/lib/types';
import ConsentSettingsButton from './ConsentSettingsButton';

/** Account info and logout (with confirmation), plus the legal links. */
export default function AppFooter({ identity, onLogout }: { identity: AuthIdentity; onLogout: () => void }) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <footer
      className="mx-auto mt-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-8 text-sm sm:flex-row sm:justify-between sm:px-6 lg:px-8"
      style={{ color: 'var(--color-text-muted)' }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <span>
          Angemeldet als <strong style={{ color: 'var(--color-text-secondary)' }}>{identity.user}</strong>
          {' · '}Schule {identity.school}
        </span>
        {isConfirming ? (
          <span className="flex items-center gap-2" role="group" aria-label="Abmelden bestätigen">
            <span style={{ color: 'var(--color-text-secondary)' }}>Wirklich abmelden?</span>
            <button type="button" className="footer-action footer-action-danger" onClick={onLogout}>
              Abmelden
            </button>
            <button type="button" className="footer-action" onClick={() => setIsConfirming(false)}>
              Abbrechen
            </button>
          </span>
        ) : (
          <button type="button" className="footer-action" onClick={() => setIsConfirming(true)}>
            <LogOut className="size-3.5" strokeWidth={2} aria-hidden />
            Abmelden
          </button>
        )}
      </div>

      <nav className="flex items-center gap-4">
        <Link href="/datenschutz" className="transition-colors hover:text-[var(--color-text)]">
          Datenschutz
        </Link>
        <Link href="/impressum" className="transition-colors hover:text-[var(--color-text)]">
          Impressum
        </Link>
        <ConsentSettingsButton />
      </nav>
    </footer>
  );
}
