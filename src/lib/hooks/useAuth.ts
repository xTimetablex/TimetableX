'use client';

import { useEffect, useState } from 'react';
import { AuthIdentity, Credentials } from '@/lib/types';
import { track } from '@/lib/analytics';
import { hasLegacyCredentials, migrateLegacyCredentials } from '@/lib/authMigration';
import { assertOk } from '@/lib/timetableQuery';

/**
 * Session identity. The server reads the session cookie while rendering
 * `/app` and passes the identity in, so there is no client round trip to find
 * out whether someone is logged in.
 */
export function useAuth(initialIdentity: AuthIdentity | null) {
  const [identity, setIdentity] = useState<AuthIdentity | null>(initialIdentity);
  const [isMigrating, setIsMigrating] = useState(false);

  // One-time exchange of pre-cookie localStorage credentials for a session.
  useEffect(() => {
    if (initialIdentity || !hasLegacyCredentials()) return;

    let cancelled = false;
    setIsMigrating(true);
    migrateLegacyCredentials()
      .then(migrated => {
        if (!cancelled && migrated) setIdentity(migrated);
      })
      .finally(() => {
        if (!cancelled) setIsMigrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialIdentity]);

  const login = async (credentials: Credentials) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    await assertOk(res, 'Anmeldung fehlgeschlagen.');
    const json: { identity: AuthIdentity } = await res.json();

    setIdentity(json.identity);
    track('user_logged_in', { school: credentials.school });
  };

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' }).catch(() => undefined);
    setIdentity(null);
    track('user_logged_out');
  };

  return { identity, isMigrating, login, logout };
}
