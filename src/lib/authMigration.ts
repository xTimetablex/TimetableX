import { AuthIdentity, Credentials } from '@/lib/types';

const LEGACY_STORAGE_KEY = 'school_creds';

export function hasLegacyCredentials(): boolean {
  try {
    return localStorage.getItem(LEGACY_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export async function migrateLegacyCredentials(): Promise<AuthIdentity | null> {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return null;

  let credentials: Credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return null;
  }

  let res: Response;
  try {
    res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  } catch {
    return null;
  }

  if (!res.ok) {
    // Login now checks the credentials against stundenplan24. Only drop them
    // when they were rejected; if stundenplan24 was just down (5xx), keep
    // them and try again on the next visit.
    if (res.status === 400 || res.status === 401) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return null;
  }

  localStorage.removeItem(LEGACY_STORAGE_KEY);
  const json = await res.json();
  return json.identity as AuthIdentity;
}
