import Database from 'better-sqlite3';
import crypto from 'crypto';
import { createAuthSession, readAuthSession } from './authSession';
import { Credentials, Favorite } from '../types';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  db = new Database(process.env.SQLITE_PATH || './data/timetablex.sqlite');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY,
      endpoint TEXT,
      p256dh TEXT,
      auth TEXT,
      creds_enc TEXT NOT NULL,
      favorites TEXT NOT NULL,
      ics_token TEXT NOT NULL UNIQUE,
      seen TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER NOT NULL
    )
  `);
  return db;
}

interface SubscriberRow {
  id: string;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
  creds_enc: string;
  favorites: string;
  ics_token: string;
  seen: string;
  updated_at: number;
}

export function upsertSubscriber(params: {
  id: string;
  credentials: Credentials;
  favorites: Favorite[];
  subscription: { endpoint: string; p256dh: string; auth: string } | null;
}): { icsToken: string } {
  const database = getDb();
  const existing = database
    .prepare<[string], SubscriberRow>('SELECT * FROM subscribers WHERE id = ?')
    .get(params.id);

  const icsToken = existing?.ics_token ?? crypto.randomBytes(24).toString('base64url');

  database
    .prepare(
      `INSERT INTO subscribers (id, endpoint, p256dh, auth, creds_enc, favorites, ics_token, seen, updated_at)
       VALUES (@id, @endpoint, @p256dh, @auth, @creds_enc, @favorites, @ics_token, @seen, @updated_at)
       ON CONFLICT(id) DO UPDATE SET
         endpoint = excluded.endpoint,
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         creds_enc = excluded.creds_enc,
         favorites = excluded.favorites,
         updated_at = excluded.updated_at`
    )
    .run({
      id: params.id,
      endpoint: params.subscription?.endpoint ?? null,
      p256dh: params.subscription?.p256dh ?? null,
      auth: params.subscription?.auth ?? null,
      creds_enc: createAuthSession(params.credentials),
      favorites: JSON.stringify(params.favorites),
      ics_token: icsToken,
      seen: existing?.seen ?? '[]',
      updated_at: Date.now(),
    });

  return { icsToken };
}

export function deleteSubscriber(id: string): void {
  getDb().prepare('DELETE FROM subscribers WHERE id = ?').run(id);
}

export function getSubscriberByIcsToken(
  token: string
): { credentials: Credentials; favorites: Favorite[] } | null {
  const row = getDb()
    .prepare<[string], SubscriberRow>('SELECT * FROM subscribers WHERE ics_token = ?')
    .get(token);
  if (!row) return null;

  const credentials = readAuthSession(row.creds_enc);
  if (!credentials) return null;

  return { credentials, favorites: JSON.parse(row.favorites) };
}

export function listPushSubscribers(): Array<{
  id: string;
  credentials: Credentials;
  favorites: Favorite[];
  subscription: { endpoint: string; p256dh: string; auth: string };
  seen: string[];
}> {
  const rows = getDb()
    .prepare<[], SubscriberRow>('SELECT * FROM subscribers WHERE endpoint IS NOT NULL')
    .all();

  return rows
    .map(row => {
      const credentials = readAuthSession(row.creds_enc);
      if (!credentials || !row.endpoint || !row.p256dh || !row.auth) return null;

      return {
        id: row.id,
        credentials,
        favorites: JSON.parse(row.favorites) as Favorite[],
        subscription: { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
        seen: JSON.parse(row.seen) as string[],
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
}

export function markSeen(id: string, keys: string[]): void {
  const database = getDb();
  const row = database
    .prepare<[string], SubscriberRow>('SELECT seen FROM subscribers WHERE id = ?')
    .get(id);
  if (!row) return;

  const existingSeen: string[] = JSON.parse(row.seen);
  const nextSeen = Array.from(new Set([...existingSeen, ...keys]));

  database.prepare('UPDATE subscribers SET seen = ? WHERE id = ?').run(JSON.stringify(nextSeen), id);
}

export function removePushSubscription(id: string): void {
  getDb()
    .prepare('UPDATE subscribers SET endpoint = NULL, p256dh = NULL, auth = NULL WHERE id = ?')
    .run(id);
}
