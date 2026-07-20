import { getDb } from './db';
import { createAuthSession, readAuthSession, getAccountId } from './authSession';
import { Credentials } from '../types';

interface AccountRow {
  id: string;
  school: string;
  login: string;
  creds_enc: string;
  created_at: number;
  updated_at: number;
}

/**
 * Provisions or refreshes the account backing a school login. The account id is derived
 * deterministically from the credentials, so re-logging in from any device updates the same row.
 */
export function upsertAccount(credentials: Credentials): { accountId: string } {
  const accountId = getAccountId(credentials);
  const now = Date.now();

  getDb()
    .prepare(
      `INSERT INTO accounts (id, school, login, creds_enc, created_at, updated_at)
       VALUES (@id, @school, @login, @creds_enc, @now, @now)
       ON CONFLICT(id) DO UPDATE SET
         creds_enc = excluded.creds_enc,
         updated_at = excluded.updated_at`
    )
    .run({
      id: accountId,
      school: credentials.school,
      login: credentials.user,
      creds_enc: createAuthSession(credentials),
      now,
    });

  return { accountId };
}

/**
 * Returns valid credentials for a school, newest login first. Shared feeds use this pool so an
 * ICS feed can be fetched with any working credential from an account holder at that school.
 */
export function getCredentialsForSchool(school: string): Credentials[] {
  const rows = getDb()
    .prepare<[string], AccountRow>(
      'SELECT * FROM accounts WHERE school = ? ORDER BY updated_at DESC'
    )
    .all(school);

  return rows
    .map(row => readAuthSession(row.creds_enc))
    .filter((creds): creds is Credentials => creds !== null);
}
