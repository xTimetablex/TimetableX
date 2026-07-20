import Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  db = new Database(process.env.SQLITE_PATH || './data/timetablex.sqlite');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      school TEXT NOT NULL,
      login TEXT NOT NULL,
      creds_enc TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(school, login)
    );

    CREATE TABLE IF NOT EXISTS feeds (
      token TEXT PRIMARY KEY,
      school TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_value TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(school, entity_type, entity_value)
    );

    CREATE TABLE IF NOT EXISTS account_feeds (
      account_id TEXT NOT NULL,
      feed_token TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY(account_id, feed_token)
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_school ON accounts(school);
  `);
  return db;
}
