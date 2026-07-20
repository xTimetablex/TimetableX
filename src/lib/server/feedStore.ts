import crypto from 'crypto';
import { getDb } from './db';
import { CalendarEntityType } from '../types';

export interface Feed {
  token: string;
  school: string;
  entityType: CalendarEntityType;
  entityValue: string;
}

interface FeedRow {
  token: string;
  school: string;
  entity_type: CalendarEntityType;
  entity_value: string;
  created_at: number;
}

/**
 * Resolves the shared feed for a (school, entity) triple, creating it on first activation, and
 * attaches the account to it. Two accounts activating the same class receive the same token.
 */
export function activateFeed(params: {
  accountId: string;
  school: string;
  entityType: CalendarEntityType;
  entityValue: string;
}): Feed {
  const db = getDb();
  const now = Date.now();

  const attach = db.transaction((): Feed => {
    let row = db
      .prepare<[string, string, string], FeedRow>(
        'SELECT * FROM feeds WHERE school = ? AND entity_type = ? AND entity_value = ?'
      )
      .get(params.school, params.entityType, params.entityValue);

    if (!row) {
      const token = crypto.randomBytes(24).toString('base64url');
      db.prepare(
        `INSERT INTO feeds (token, school, entity_type, entity_value, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(token, params.school, params.entityType, params.entityValue, now);
      row = {
        token,
        school: params.school,
        entity_type: params.entityType,
        entity_value: params.entityValue,
        created_at: now,
      };
    }

    db.prepare(
      `INSERT INTO account_feeds (account_id, feed_token, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT(account_id, feed_token) DO NOTHING`
    ).run(params.accountId, row.token, now);

    return {
      token: row.token,
      school: row.school,
      entityType: row.entity_type,
      entityValue: row.entity_value,
    };
  });

  return attach();
}

/** Detaches an account from a feed, garbage-collecting the feed when no account references it. */
export function deactivateFeed(accountId: string, token: string): void {
  const db = getDb();
  const detach = db.transaction(() => {
    db.prepare('DELETE FROM account_feeds WHERE account_id = ? AND feed_token = ?').run(
      accountId,
      token
    );
    const remaining = db
      .prepare<[string], { count: number }>(
        'SELECT COUNT(*) AS count FROM account_feeds WHERE feed_token = ?'
      )
      .get(token);
    if (!remaining || remaining.count === 0) {
      db.prepare('DELETE FROM feeds WHERE token = ?').run(token);
    }
  });
  detach();
}

export function listFeedsForAccount(accountId: string): Feed[] {
  return getDb()
    .prepare<[string], FeedRow>(
      `SELECT f.* FROM feeds f
       JOIN account_feeds af ON af.feed_token = f.token
       WHERE af.account_id = ?
       ORDER BY af.created_at ASC`
    )
    .all(accountId)
    .map(row => ({
      token: row.token,
      school: row.school,
      entityType: row.entity_type,
      entityValue: row.entity_value,
    }));
}

export function getFeedByToken(token: string): Feed | null {
  const row = getDb()
    .prepare<[string], FeedRow>('SELECT * FROM feeds WHERE token = ?')
    .get(token);
  if (!row) return null;
  return {
    token: row.token,
    school: row.school,
    entityType: row.entity_type,
    entityValue: row.entity_value,
  };
}
