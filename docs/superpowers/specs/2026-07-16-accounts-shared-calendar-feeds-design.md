# Accounts + Shared Class/Teacher Calendar Feeds

Date: 2026-07-16

## Goal

1. Every user must have an account to use the calendar feature.
2. Two users on the same class (or teacher) share one ICS feed — the server does not
   fetch/serve the timetable twice.
3. The "Aktivieren" button opens a choose-menu so users explicitly pick which class/teacher
   their calendar contains.

## Decisions (user-approved)

- **Account = persisted school login.** No separate email/password signup. The school
  credentials already entered ARE the account identity.
- **Shared per-entity feed URLs.** One calendar URL per `(school, entity_type, entity_value)`.
- **Picker covers class + teacher.** ICS builder extended to emit teacher schedules.
- **One URL per entity.** A user who wants several classes/teachers adds several shared links.

## Architecture

### Data model (SQLite)

```
accounts (
  id         TEXT PRIMARY KEY,   -- HMAC(secret, school|login), deterministic + stable
  school     TEXT NOT NULL,
  login      TEXT NOT NULL,      -- school username
  creds_enc  TEXT NOT NULL,      -- encrypted Credentials (aes-256-gcm, existing scheme)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(school, login)
)

feeds (
  token        TEXT PRIMARY KEY, -- random base64url, unguessable
  school       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,    -- 'class' | 'teacher'
  entity_value TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  UNIQUE(school, entity_type, entity_value)
)

account_feeds (
  account_id TEXT NOT NULL,
  feed_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(account_id, feed_token)
)
```

### Session / account provisioning

- Session cookie format unchanged (encrypted `Credentials`).
- `getAccountId(creds) = HMAC(secret, school|login)` — server derives account id from the
  in-session creds; no cookie change, stable across devices.
- `POST /api/auth` upserts the `accounts` row on successful login (account creation is
  transparent, happens on login).

### Feeds + dedup

- `POST /api/calendar/feeds` (auth required): body `{ entityType, entityValue }`. Resolves the
  shared feed for `(session.school, type, value)`, creating the row on first activation
  (`INSERT ... ON CONFLICT(school,entity_type,entity_value) DO NOTHING`), attaches the account
  via `account_feeds`, returns `{ icsUrl }`. Two accounts, same class → same token → same URL.
- `GET /api/calendar/feeds` (auth required): lists the account's active feeds.
- `DELETE /api/calendar/feeds` (auth required): body `{ token }`. Detaches the account;
  garbage-collects the feed row when the last account detaches.
- `GET /api/calendar/[token]`: resolves token → `(school, type, value)`; fetches that school's
  timetable via the credential pool; builds a single-entity ICS. No per-user creds in the token.

### Credential pool

`getCredentialsForSchool(school)` → newest-first list of decrypted creds from `accounts` for
that school. The ICS route tries them in order, skipping ones that fail upstream auth. Every feed
subscriber is an account holder for the school, so a working credential always exists.

### Caching ("don't fetch twice")

Module-level in-memory cache of the fetched 7-week window keyed by `school`, TTL ~10 min. All
class+teacher feeds for one school and all repeated calendar-client pulls within the window share
one upstream fetch. Single-container deployment, so in-process cache is sufficient; documented as
the scaling boundary (move to shared cache if the web tier is ever horizontally scaled).

### ICS builder

`buildIcsCalendar(week, { type, value })` filters by one entity:
- class feed: `entry.class === value`, `SUMMARY = subject`
- teacher feed: `entry.teacher === value`, `SUMMARY = "{subject} · {class}"`
Cancelled-entry handling (`❌`, `STATUS:CANCELLED`) preserved.

### UI

- **Aktivieren** opens `CalendarPicker` (searchable, same entity source as the ⌘K palette),
  listing Klassen + Lehrer. Selecting one activates its shared feed and reveals its URL.
- Active feeds listed with copy + remove. Favorites no longer gate the calendar.
- `useCalendarLink` → `useCalendarFeeds` (list/add/remove against `/api/calendar/feeds`).

## Cutover

Replaces `subscribers` table, `/api/calendar/subscribe`, `useCalendarLink`, and the anonymous
`localStorage` subscriber id. Existing `.ics` links break; users re-activate. Clean cutover, no
shims (feature shipped same day; origin fix already invalidated links this session).

## Tests

- Rework `calendarRoute.test.ts` for feed-by-token resolution.
- Dedup: two accounts, same class → identical token.
- Teacher-feed filtering emits teacher's lessons with class in SUMMARY.
- Credential-pool fallback skips a failing cred.
- `POST /api/calendar/feeds` returns 401 unauthenticated.
