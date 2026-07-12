# Push Notifications + iCal Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user enable push notifications for cancelled lessons / room changes on their favorited classes, and get a subscribable `.ics` calendar feed of those classes' timetables.

**Architecture:** A new SQLite-backed `subscribers` table stores (per opaque browser-generated id) an encrypted copy of the user's school credentials, their favorited classes, a Web Push subscription, an `.ics` access token, and a de-dupe set of already-notified changes. A new Next.js API route lets the client opt in/out. A second Docker service (`worker`, same image, different command) polls every 15 minutes on school days, diffs each subscriber's favorited classes against `fetchStundenplan`, and sends Web Push notifications for new cancellations/room-changes. A third API route serves the live `.ics` feed by token, no cookie required, so calendar apps can poll it directly.

**Tech Stack:** `better-sqlite3` (storage), `web-push` (Web Push protocol + VAPID), `node-cron` (worker scheduling), `tsx` (runs the TS worker directly in the production image, no separate build step).

## Global Constraints

- Spec location: `docs/superpowers/specs/2026-07-12-push-notifications-and-ical-export-design.md`
- Reuse `createAuthSession` / `readAuthSession` from `src/lib/server/authSession.ts` for encrypting/decrypting stored credentials — do not add a second crypto implementation.
- Reuse the existing cancellation-detection regex logic (currently inline in `TimetableTable.tsx`) — move it, don't duplicate it.
- `npm run lint` (which runs `tsc --noEmit`) and `npm test` (Vitest) must pass after every task.
- Deviation from spec, called out explicitly: the spec says lesson times should be "parsed from the source XML when present, otherwise fall back to a configurable bell schedule." The current XML parser (`src/lib/stundenplan.ts`) does not extract any clock-time field — only an hour number (`St`) — and no sample XML in this repo contains one. There is nothing to parse. The bell-schedule lookup (hour number → start/end time) is therefore the **only** time source; this is a simplification of the spec, not a bug. It's marked with a `ponytail:` comment at the point of simplification.
- All new user-facing strings are German, matching the rest of the app (see e.g. `'Maximal 4 Favoriten möglich.'` in `useFavorites.ts`).
- Existing regression test `src/lib/__tests__/projectAudit.test.ts` currently asserts `layout.tsx` **unregisters** any service worker and does not contain `register('/sw.js')`. This plan intentionally changes that behavior (a new, minimal, push-only service worker is registered). Task 8 updates that specific assertion — do not remove or weaken any of the test's other assertions.

---

### Task 1: Add dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `better-sqlite3`, `web-push`, `node-cron`, `tsx` importable from any subsequent task.

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install better-sqlite3 web-push node-cron tsx
```

- [ ] **Step 2: Install matching type packages**

```bash
npm install --save-dev @types/better-sqlite3 @types/web-push @types/node-cron
```

- [ ] **Step 3: Verify the project still builds and type-checks**

Run: `npm run lint`
Expected: exits 0, no new errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add better-sqlite3, web-push, node-cron, tsx dependencies"
```

---

### Task 2: Extract shared cancellation-detection logic

**Files:**
- Create: `src/lib/timetableEntry.ts`
- Create: `src/lib/__tests__/timetableEntry.test.ts`
- Modify: `src/components/TimetableTable.tsx:14-19`

**Interfaces:**
- Produces: `isCancelledEntry(entry: TimetableEntry): boolean` from `src/lib/timetableEntry.ts`, used by `TimetableTable.tsx` (Task 2) and `worker/notify.ts` (Task 11).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/timetableEntry.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { isCancelledEntry } from '../timetableEntry';
import { TimetableEntry } from '../types';

function entry(overrides: Partial<TimetableEntry>): TimetableEntry {
  return {
    class: '9/2',
    hour: '1',
    subject: 'MA',
    teacher: 'KNO',
    room: '313',
    info: '---',
    ...overrides,
  };
}

describe('isCancelledEntry', () => {
  it('detects "entfall" in the info text', () => {
    expect(isCancelledEntry(entry({ info: 'Sport Entfall' }))).toBe(true);
  });

  it('detects "fällt aus" in the info text', () => {
    expect(isCancelledEntry(entry({ info: 'Fach fällt aus' }))).toBe(true);
  });

  it('detects "ausfall" in the subject field', () => {
    expect(isCancelledEntry(entry({ subject: 'Ausfall' }))).toBe(true);
  });

  it('returns false for a normal entry', () => {
    expect(isCancelledEntry(entry({}))).toBe(false);
  });

  it('returns false for a room change without cancellation', () => {
    expect(isCancelledEntry(entry({ info: 'Raumänderung: Zimmer E204', roomChanged: true }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/timetableEntry.test.ts`
Expected: FAIL — `Cannot find module '../timetableEntry'`

- [ ] **Step 3: Create the shared module**

Create `src/lib/timetableEntry.ts`:

```typescript
import { TimetableEntry } from './types';

export function isCancelledEntry(entry: TimetableEntry): boolean {
  const combinedText = `${entry.subject} ${entry.info} ${entry.teacher} ${entry.room}`.toLowerCase();
  return ['ausfall', 'entfall', 'fällt aus', 'faellt aus', 'cancel'].some(keyword =>
    combinedText.includes(keyword)
  );
}
```

- [ ] **Step 4: Update `TimetableTable.tsx` to import instead of defining it locally**

In `src/components/TimetableTable.tsx`, replace lines 14-19:

```typescript
function isCancelledEntry(entry: TimetableEntry): boolean {
  const combinedText = `${entry.subject} ${entry.info} ${entry.teacher} ${entry.room}`.toLowerCase();
  return ['ausfall', 'entfall', 'fällt aus', 'faellt aus', 'cancel'].some(keyword =>
    combinedText.includes(keyword)
  );
}
```

with:

```typescript
import { isCancelledEntry } from '@/lib/timetableEntry';
```

(Move this new `import` line up next to the other imports at the top of the file, alongside `import { TimetableEntry } from '@/lib/types';`.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/timetableEntry.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Run the full test suite to confirm no regression in TimetableTable**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/timetableEntry.ts src/lib/__tests__/timetableEntry.test.ts src/components/TimetableTable.tsx
git commit -m "Extract isCancelledEntry into a shared module"
```

---

### Task 3: Bell schedule lookup

**Files:**
- Create: `src/lib/bellSchedule.ts`
- Create: `src/lib/__tests__/bellSchedule.test.ts`

**Interfaces:**
- Produces: `getBellTimes(hour: string): { start: string; end: string } | null` from `src/lib/bellSchedule.ts`, used by `src/lib/ics.ts` (Task 4). `start`/`end` are `HH:MM` 24-hour strings.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/bellSchedule.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { getBellTimes } from '../bellSchedule';

describe('getBellTimes', () => {
  it('returns start/end for a known hour', () => {
    expect(getBellTimes('1')).toEqual({ start: '07:45', end: '08:30' });
  });

  it('returns start/end for hour 6', () => {
    expect(getBellTimes('6')).toEqual({ start: '12:35', end: '13:20' });
  });

  it('returns null for an unknown hour', () => {
    expect(getBellTimes('99')).toBeNull();
  });

  it('returns null for the fallback placeholder', () => {
    expect(getBellTimes('---')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/bellSchedule.test.ts`
Expected: FAIL — `Cannot find module '../bellSchedule'`

- [ ] **Step 3: Implement the bell schedule**

Create `src/lib/bellSchedule.ts`:

```typescript
// ponytail: the source XML carries only an hour number (no clock time),
// so a fixed default schedule is the sole time source. Upgrade to a
// per-school configurable schedule if a school with a different bell
// schedule needs this feature.
const DEFAULT_BELL_SCHEDULE: Record<string, { start: string; end: string }> = {
  '1': { start: '07:45', end: '08:30' },
  '2': { start: '08:35', end: '09:20' },
  '3': { start: '09:40', end: '10:25' },
  '4': { start: '10:30', end: '11:15' },
  '5': { start: '11:35', end: '12:20' },
  '6': { start: '12:35', end: '13:20' },
  '7': { start: '13:25', end: '14:10' },
  '8': { start: '14:15', end: '15:00' },
};

export function getBellTimes(hour: string): { start: string; end: string } | null {
  return DEFAULT_BELL_SCHEDULE[hour] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/bellSchedule.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/bellSchedule.ts src/lib/__tests__/bellSchedule.test.ts
git commit -m "Add bell schedule lookup for iCal event times"
```

---

### Task 4: iCal (.ics) builder

**Files:**
- Create: `src/lib/ics.ts`
- Create: `src/lib/__tests__/ics.test.ts`

**Interfaces:**
- Consumes: `TimetableWeekData`, `TimetableDayData`, `TimetableEntry` from `src/lib/types.ts`; `getBellTimes` from `src/lib/bellSchedule.ts` (Task 3); `isCancelledEntry` from `src/lib/timetableEntry.ts` (Task 2).
- Produces: `buildIcsCalendar(week: TimetableWeekData, classes: string[]): string` from `src/lib/ics.ts`, used by `src/app/api/calendar/[token]/route.ts` (Task 7).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/ics.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { buildIcsCalendar } from '../ics';
import { TimetableWeekData } from '../types';

const week: TimetableWeekData = {
  title: 'Stundenplan',
  date: 'Woche vom 1.6 - 5.6',
  currentDateStr: '20260601',
  weekStartStr: '20260601',
  availableClasses: ['9/2'],
  availableRooms: ['313'],
  availableTeachers: ['KNO'],
  days: [
    {
      title: 'Stundenplan',
      date: 'Montag, 1. Juni 2026',
      currentDateStr: '20260601',
      entries: [
        { class: '9/2', hour: '1', subject: 'MA', teacher: 'KNO', room: '313', info: '---' },
        { class: '9/2', hour: '2', subject: 'SPO', teacher: '---', room: '---', info: 'Sport fällt aus' },
        { class: '10/1', hour: '1', subject: 'DE', teacher: 'MEY', room: '311', info: '---' },
      ],
      availableClasses: ['9/2', '10/1'],
      availableRooms: ['313', '311'],
      availableTeachers: ['KNO', 'MEY'],
    },
  ],
};

describe('buildIcsCalendar', () => {
  it('starts with the required VCALENDAR header and footer', () => {
    const ics = buildIcsCalendar(week, ['9/2']);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('includes one VEVENT per entry for the requested classes only', () => {
    const ics = buildIcsCalendar(week, ['9/2']);
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(2);
    expect(ics).not.toContain('SUMMARY:DE');
  });

  it('marks cancelled lessons with STATUS:CANCELLED and a prefix', () => {
    const ics = buildIcsCalendar(week, ['9/2']);
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics).toContain('SUMMARY:❌ SPO');
  });

  it('puts the room in LOCATION', () => {
    const ics = buildIcsCalendar(week, ['9/2']);
    expect(ics).toContain('LOCATION:313');
  });

  it('omits entries for hours with no known bell time', () => {
    const weekWithUnknownHour: TimetableWeekData = {
      ...week,
      days: [
        {
          ...week.days[0],
          entries: [{ class: '9/2', hour: '99', subject: 'MA', teacher: 'KNO', room: '313', info: '---' }],
        },
      ],
    };
    const ics = buildIcsCalendar(weekWithUnknownHour, ['9/2']);
    expect(ics.match(/BEGIN:VEVENT/g)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ics.test.ts`
Expected: FAIL — `Cannot find module '../ics'`

- [ ] **Step 3: Implement the ICS builder**

Create `src/lib/ics.ts`:

```typescript
import { getBellTimes } from './bellSchedule';
import { isCancelledEntry } from './timetableEntry';
import { TimetableWeekData } from './types';

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function toIcsDateTime(dateStr: string, time: string): string {
  const [hh, mm] = time.split(':');
  return `${dateStr}T${hh}${mm}00`;
}

export function buildIcsCalendar(week: TimetableWeekData, classes: string[]): string {
  const classSet = new Set(classes);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TimetableX//Vertretungsplan//DE',
    'CALSCALE:GREGORIAN',
  ];

  for (const day of week.days) {
    for (const entry of day.entries) {
      if (!classSet.has(entry.class)) continue;

      const bellTimes = getBellTimes(entry.hour);
      if (!bellTimes) continue;

      const cancelled = isCancelledEntry(entry);
      const uid = `${day.currentDateStr}-${entry.class}-${entry.hour}@timetablex`;
      const summary = escapeIcsText(`${cancelled ? '❌ ' : ''}${entry.subject}`.trim());

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${toIcsDateTime(day.currentDateStr, bellTimes.start)}`,
        `DTEND:${toIcsDateTime(day.currentDateStr, bellTimes.end)}`,
        `SUMMARY:${summary}`,
        `LOCATION:${escapeIcsText(entry.room)}`,
        `DESCRIPTION:${escapeIcsText(entry.info)}`,
      );
      if (cancelled) lines.push('STATUS:CANCELLED');
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ics.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ics.ts src/lib/__tests__/ics.test.ts
git commit -m "Add iCal calendar builder for favorited classes"
```

---

### Task 5: SQLite subscriber store

**Files:**
- Create: `src/lib/server/subscriberStore.ts`
- Create: `src/lib/__tests__/subscriberStore.test.ts`

**Interfaces:**
- Consumes: `createAuthSession`, `readAuthSession` from `src/lib/server/authSession.ts`; `Credentials`, `Favorite` from `src/lib/types.ts`.
- Produces (all from `src/lib/server/subscriberStore.ts`):
  - `upsertSubscriber(params: { id: string; credentials: Credentials; favorites: Favorite[]; subscription: { endpoint: string; p256dh: string; auth: string } | null }): { icsToken: string }`
  - `deleteSubscriber(id: string): void`
  - `getSubscriberByIcsToken(token: string): { credentials: Credentials; favorites: Favorite[] } | null`
  - `listPushSubscribers(): Array<{ id: string; credentials: Credentials; favorites: Favorite[]; subscription: { endpoint: string; p256dh: string; auth: string }; seen: string[] }>`
  - `markSeen(id: string, keys: string[]): void`
  - `removePushSubscription(id: string): void`

  Used by `src/app/api/notifications/subscribe/route.ts` (Task 6), `src/app/api/calendar/[token]/route.ts` (Task 7), `worker/notify.ts` (Task 11).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/subscriberStore.test.ts`:

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';

const CREDS = { school: '12345', user: 'testuser', pass: 'testpass' };
const FAVORITES = [{ mode: 'class' as const, value: '9/2' }];
const SUBSCRIPTION = { endpoint: 'https://push.example/abc', p256dh: 'p256dh-key', auth: 'auth-key' };

async function freshStore() {
  vi.resetModules();
  process.env.SQLITE_PATH = ':memory:';
  return await import('../server/subscriberStore');
}

beforeEach(() => {
  vi.resetModules();
});

describe('subscriberStore', () => {
  it('round-trips credentials and favorites via the ics token', async () => {
    const store = await freshStore();
    const { icsToken } = store.upsertSubscriber({
      id: 'user-1',
      credentials: CREDS,
      favorites: FAVORITES,
      subscription: null,
    });

    const found = store.getSubscriberByIcsToken(icsToken);
    expect(found).toEqual({ credentials: CREDS, favorites: FAVORITES });
  });

  it('returns null for an unknown ics token', async () => {
    const store = await freshStore();
    expect(store.getSubscriberByIcsToken('does-not-exist')).toBeNull();
  });

  it('lists a subscriber with a push subscription for the worker', async () => {
    const store = await freshStore();
    store.upsertSubscriber({
      id: 'user-2',
      credentials: CREDS,
      favorites: FAVORITES,
      subscription: SUBSCRIPTION,
    });

    const subscribers = store.listPushSubscribers();
    expect(subscribers).toHaveLength(1);
    expect(subscribers[0]).toMatchObject({
      id: 'user-2',
      credentials: CREDS,
      favorites: FAVORITES,
      subscription: SUBSCRIPTION,
      seen: [],
    });
  });

  it('excludes subscribers without a push subscription from listPushSubscribers', async () => {
    const store = await freshStore();
    store.upsertSubscriber({ id: 'user-3', credentials: CREDS, favorites: FAVORITES, subscription: null });

    expect(store.listPushSubscribers()).toHaveLength(0);
  });

  it('persists seen keys across markSeen calls', async () => {
    const store = await freshStore();
    store.upsertSubscriber({ id: 'user-4', credentials: CREDS, favorites: FAVORITES, subscription: SUBSCRIPTION });

    store.markSeen('user-4', ['20260601|9/2|1|cancelled']);
    const subscribers = store.listPushSubscribers();
    expect(subscribers[0].seen).toEqual(['20260601|9/2|1|cancelled']);
  });

  it('removes a subscriber entirely on deleteSubscriber', async () => {
    const store = await freshStore();
    const { icsToken } = store.upsertSubscriber({
      id: 'user-5',
      credentials: CREDS,
      favorites: FAVORITES,
      subscription: SUBSCRIPTION,
    });

    store.deleteSubscriber('user-5');
    expect(store.getSubscriberByIcsToken(icsToken)).toBeNull();
    expect(store.listPushSubscribers()).toHaveLength(0);
  });

  it('clears only the push subscription on removePushSubscription, keeping the ics feed alive', async () => {
    const store = await freshStore();
    const { icsToken } = store.upsertSubscriber({
      id: 'user-6',
      credentials: CREDS,
      favorites: FAVORITES,
      subscription: SUBSCRIPTION,
    });

    store.removePushSubscription('user-6');
    expect(store.listPushSubscribers()).toHaveLength(0);
    expect(store.getSubscriberByIcsToken(icsToken)).toEqual({ credentials: CREDS, favorites: FAVORITES });
  });

  it('upsert replaces favorites and subscription for the same id rather than duplicating', async () => {
    const store = await freshStore();
    store.upsertSubscriber({ id: 'user-7', credentials: CREDS, favorites: FAVORITES, subscription: null });
    store.upsertSubscriber({
      id: 'user-7',
      credentials: CREDS,
      favorites: [{ mode: 'class', value: '10/1' }],
      subscription: SUBSCRIPTION,
    });

    const subscribers = store.listPushSubscribers();
    expect(subscribers).toHaveLength(1);
    expect(subscribers[0].favorites).toEqual([{ mode: 'class', value: '10/1' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/subscriberStore.test.ts`
Expected: FAIL — `Cannot find module '../server/subscriberStore'`

- [ ] **Step 3: Implement the subscriber store**

Create `src/lib/server/subscriberStore.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/subscriberStore.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Add the SQLite data directory to `.gitignore`**

Append to `.gitignore`:

```
/data
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/subscriberStore.ts src/lib/__tests__/subscriberStore.test.ts .gitignore
git commit -m "Add SQLite-backed subscriber store for push and iCal"
```

---

### Task 6: Subscribe/unsubscribe API route

**Files:**
- Create: `src/app/api/notifications/subscribe/route.ts`
- Create: `src/lib/__tests__/notificationsSubscribeRoute.test.ts`

**Interfaces:**
- Consumes: `getAuthCredentials` from `src/lib/server/authSession.ts`; `upsertSubscriber`, `deleteSubscriber` from `src/lib/server/subscriberStore.ts` (Task 5).
- Produces: `POST /api/notifications/subscribe` (body `{ id, favorites, subscription }`) → `{ icsUrl }`; `DELETE /api/notifications/subscribe` (body `{ id }`) → `{ ok: true }`. Used by `src/lib/hooks/useNotifications.ts` (Task 9).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/notificationsSubscribeRoute.test.ts`:

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createAuthSession, AUTH_COOKIE_NAME } from '../server/authSession';

const CREDS = { school: '12345', user: 'testuser', pass: 'testpass' };

function requestWithCookie(body: unknown, method: 'POST' | 'DELETE' = 'POST'): Request {
  return new Request('https://example.test/api/notifications/subscribe', {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie: `${AUTH_COOKIE_NAME}=${createAuthSession(CREDS)}`,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetModules();
  process.env.SQLITE_PATH = ':memory:';
});

describe('POST /api/notifications/subscribe', () => {
  it('stores the subscription and returns an ics feed URL', async () => {
    const { POST } = await import('../../app/api/notifications/subscribe/route');
    const response = await POST(
      requestWithCookie({
        id: 'browser-1',
        favorites: [{ mode: 'class', value: '9/2' }],
        subscription: { endpoint: 'https://push.example/x', keys: { p256dh: 'k', auth: 'a' } },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.icsUrl).toContain('/api/calendar/');
  });

  it('rejects when there is no auth session cookie', async () => {
    const { POST } = await import('../../app/api/notifications/subscribe/route');
    const response = await POST(
      new Request('https://example.test/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'browser-2', favorites: [], subscription: null }),
      })
    );

    expect(response.status).toBe(401);
  });

  it('rejects a malformed body', async () => {
    const { POST } = await import('../../app/api/notifications/subscribe/route');
    const response = await POST(requestWithCookie({ id: 'browser-3' }));

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/notifications/subscribe', () => {
  it('removes the subscriber', async () => {
    const { POST, DELETE } = await import('../../app/api/notifications/subscribe/route');
    await POST(
      requestWithCookie({
        id: 'browser-4',
        favorites: [{ mode: 'class', value: '9/2' }],
        subscription: { endpoint: 'https://push.example/x', keys: { p256dh: 'k', auth: 'a' } },
      })
    );

    const response = await DELETE(requestWithCookie({ id: 'browser-4' }, 'DELETE'));
    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/notificationsSubscribeRoute.test.ts`
Expected: FAIL — `Cannot find module '../../app/api/notifications/subscribe/route'`

- [ ] **Step 3: Implement the route**

Create `src/app/api/notifications/subscribe/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthCredentials } from '@/lib/server/authSession';
import { upsertSubscriber, deleteSubscriber } from '@/lib/server/subscriberStore';

const FavoriteSchema = z.object({
  mode: z.enum(['class', 'room', 'teacher']),
  value: z.string().min(1),
});

const SubscribeSchema = z.object({
  id: z.string().min(1),
  favorites: z.array(FavoriteSchema),
  subscription: z
    .object({
      endpoint: z.string().min(1),
      keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
    })
    .nullable(),
});

const UnsubscribeSchema = z.object({ id: z.string().min(1) });

export async function POST(request: Request) {
  const credentials = getAuthCredentials(request);
  if (!credentials) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const body = await request.json();
  const result = SubscribeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { id, favorites, subscription } = result.data;
  const { icsToken } = upsertSubscriber({
    id,
    credentials,
    favorites,
    subscription: subscription
      ? { endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
      : null,
  });

  const origin = new URL(request.url).origin;
  return NextResponse.json({ icsUrl: `${origin}/api/calendar/${icsToken}.ics` });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const result = UnsubscribeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  deleteSubscriber(result.data.id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/notificationsSubscribeRoute.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/notifications/subscribe/route.ts src/lib/__tests__/notificationsSubscribeRoute.test.ts
git commit -m "Add notifications subscribe/unsubscribe API route"
```

---

### Task 7: iCal feed API route

**Files:**
- Create: `src/app/api/calendar/[token]/route.ts`
- Create: `src/lib/__tests__/calendarRoute.test.ts`

**Interfaces:**
- Consumes: `getSubscriberByIcsToken` from `src/lib/server/subscriberStore.ts` (Task 5); `fetchWeekStundenplan` from `src/lib/stundenplan.ts`; `buildIcsCalendar` from `src/lib/ics.ts` (Task 4).
- Produces: `GET /api/calendar/[token].ics` → `text/calendar` body.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/calendarRoute.test.ts`:

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { upsertSubscriber } from '../server/subscriberStore';

beforeEach(() => {
  vi.resetModules();
  process.env.SQLITE_PATH = ':memory:';
});

describe('GET /api/calendar/[token]', () => {
  it('returns a text/calendar feed for a known token', async () => {
    const { icsToken } = upsertSubscriber({
      id: 'browser-1',
      credentials: { school: 'sample', user: 'x', pass: 'x' },
      favorites: [{ mode: 'class', value: '5/1' }],
      subscription: null,
    });

    const { GET } = await import('../../app/api/calendar/[token]/route');
    const response = await GET(new Request(`https://example.test/api/calendar/${icsToken}.ics`), {
      params: Promise.resolve({ token: `${icsToken}.ics` }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/calendar');
    const text = await response.text();
    expect(text).toContain('BEGIN:VCALENDAR');
  });

  it('returns 404 for an unknown token', async () => {
    const { GET } = await import('../../app/api/calendar/[token]/route');
    const response = await GET(new Request('https://example.test/api/calendar/nope.ics'), {
      params: Promise.resolve({ token: 'nope.ics' }),
    });

    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/calendarRoute.test.ts`
Expected: FAIL — `Cannot find module '../../app/api/calendar/[token]/route'`

- [ ] **Step 3: Implement the route**

Create `src/app/api/calendar/[token]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getSubscriberByIcsToken } from '@/lib/server/subscriberStore';
import { fetchWeekStundenplan } from '@/lib/stundenplan';
import { buildIcsCalendar } from '@/lib/ics';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const token = rawToken.replace(/\.ics$/, '');

  const subscriber = getSubscriberByIcsToken(token);
  if (!subscriber) {
    return NextResponse.json({ error: 'Unbekannter Kalender-Link.' }, { status: 404 });
  }

  const { credentials, favorites } = subscriber;
  const classes = favorites.filter(f => f.mode === 'class').map(f => f.value);

  const week = await fetchWeekStundenplan(credentials.school, credentials.user, credentials.pass);
  const ics = buildIcsCalendar(week, classes);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="timetablex.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/calendarRoute.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/calendar/\[token\]/route.ts src/lib/__tests__/calendarRoute.test.ts
git commit -m "Add public iCal feed API route"
```

---

### Task 8: Push-only service worker + registration

**Files:**
- Create: `public/sw.js`
- Modify: `src/app/layout.tsx:39-52`
- Modify: `src/lib/__tests__/projectAudit.test.ts:44-49`

**Interfaces:**
- Produces: a registered service worker at `/sw.js` handling `push` and `notificationclick`, consumed by the browser push subscription flow in Task 9.

- [ ] **Step 1: Create the service worker**

Create `public/sw.js`:

```javascript
// Push-only service worker. Deliberately does NOT implement a 'fetch'
// handler or any caching — the previous offline-cache service worker
// was removed for causing stale content, and this one must not repeat
// that. It exists solely to receive push events while the app is closed.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      data: { url: payload.url || '/app' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/app';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
```

- [ ] **Step 2: Replace the unregister script in `layout.tsx` with registration**

In `src/app/layout.tsx`, replace lines 39-52:

```tsx
        <Script id="unregister-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.getRegistrations()
                  .then(function(registrations) {
                    registrations.forEach(function(registration) {
                      registration.unregister();
                    });
                  });
              });
            }
          `}
        </Script>
```

with:

```tsx
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js');
              });
            }
          `}
        </Script>
```

- [ ] **Step 3: Update the regression guard test to match the new intentional behavior**

In `src/lib/__tests__/projectAudit.test.ts`, replace the test at lines 44-49:

```typescript
  it('does not register the stale offline service worker', () => {
    const layout = read('src/app/layout.tsx');

    expect(layout).toContain('getRegistrations');
    expect(layout).toContain('unregister');
    expect(layout).not.toContain("register('/sw.js')");
  });
```

with:

```typescript
  it('registers the push-only service worker with no fetch/cache handler', () => {
    const layout = read('src/app/layout.tsx');
    const sw = read('public/sw.js');

    expect(layout).toContain("register('/sw.js')");
    expect(sw).not.toContain("addEventListener('fetch'");
  });
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the updated `projectAudit.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add public/sw.js src/app/layout.tsx src/lib/__tests__/projectAudit.test.ts
git commit -m "Register a minimal push-only service worker"
```

---

### Task 9: Client notifications hook

**Files:**
- Create: `src/lib/hooks/useNotifications.ts`

**Interfaces:**
- Consumes: `Favorite` from `src/lib/types.ts`; `track` from `src/lib/analytics.ts`; `POST`/`DELETE /api/notifications/subscribe` from Task 6.
- Produces: `useNotifications(favorites: Favorite[]): { isSupported: boolean; isEnabled: boolean; icsUrl: string | null; isBusy: boolean; enable: () => Promise<void>; disable: () => Promise<void> }`, used by `src/components/NotificationSettings.tsx` (Task 10).

No dedicated automated test for this task: it depends entirely on browser-only APIs (`Notification`, `PushManager`, `serviceWorker.ready`) that jsdom does not implement, so this is exercised through the manual smoke test in Task 13 (per the "no test needed for glue code with nothing to unit-assert" carve-out — the actual subscribe/unsubscribe logic it calls is already tested in Task 6).

- [ ] **Step 1: Create the storage key helper and hook**

Create `src/lib/hooks/useNotifications.ts`:

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Favorite } from '@/lib/types';
import { track } from '@/lib/analytics';

const SUBSCRIBER_ID_KEY = 'notif_subscriber_id';
const ENABLED_KEY = 'notif_enabled';

function getOrCreateSubscriberId(): string {
  let id = localStorage.getItem(SUBSCRIBER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SUBSCRIBER_ID_KEY, id);
  }
  return id;
}

export function useNotifications(favorites: Favorite[]) {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
    setIsEnabled(localStorage.getItem(ENABLED_KEY) === 'true');
  }, []);

  const enable = useCallback(async () => {
    if (!isSupported) return;
    setIsBusy(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      const id = getOrCreateSubscriberId();
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, favorites, subscription: subscription.toJSON() }),
      });
      if (!res.ok) throw new Error('Anmeldung für Benachrichtigungen fehlgeschlagen.');

      const { icsUrl: url } = await res.json();
      setIcsUrl(url);
      setIsEnabled(true);
      localStorage.setItem(ENABLED_KEY, 'true');
      track('notifications_enabled', { favorite_count: favorites.length });
    } finally {
      setIsBusy(false);
    }
  }, [isSupported, favorites]);

  const disable = useCallback(async () => {
    setIsBusy(true);
    try {
      const id = getOrCreateSubscriberId();
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }).catch(() => undefined);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await subscription?.unsubscribe();

      setIsEnabled(false);
      setIcsUrl(null);
      localStorage.setItem(ENABLED_KEY, 'false');
      track('notifications_disabled');
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { isSupported, isEnabled, icsUrl, isBusy, enable, disable };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: exits 0. (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is read as `string | undefined`; `subscribe()`'s `applicationServerKey` accepts `undefined` at the type level even though it will reject at runtime if actually undefined — this is fine, Task 12 ensures the env var is always set in deployment.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/useNotifications.ts
git commit -m "Add useNotifications client hook"
```

---

### Task 10: Notification settings UI

**Files:**
- Create: `src/components/NotificationSettings.tsx`
- Modify: `src/components/ClientViewer.tsx`

**Interfaces:**
- Consumes: `useNotifications` from `src/lib/hooks/useNotifications.ts` (Task 9); `Favorite` from `src/lib/types.ts`; `Button` from `src/components/button.tsx`.
- Renders inline in the selection screen of `ClientViewer.tsx`, below the existing favorites list.

- [ ] **Step 1: Create the component**

Create `src/components/NotificationSettings.tsx`, following the visual conventions of `BlacklistModal.tsx` (CSS variable tokens, `lucide-react` icons, `Button` component):

```tsx
'use client';

import { useState } from 'react';
import { Bell, BellOff, Copy, Check } from 'lucide-react';
import { Button } from './button';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { Favorite } from '@/lib/types';

interface NotificationSettingsProps {
  favorites: Favorite[];
}

export default function NotificationSettings({ favorites }: NotificationSettingsProps) {
  const { isSupported, isEnabled, icsUrl, isBusy, enable, disable } = useNotifications(favorites);
  const [copied, setCopied] = useState(false);

  if (!isSupported) return null;

  const classFavorites = favorites.filter(f => f.mode === 'class');

  return (
    <div
      className="mt-4 p-4 rounded-lg flex flex-col gap-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          {isEnabled ? <Bell className="size-4" strokeWidth={2} /> : <BellOff className="size-4" strokeWidth={2} />}
          <span className="text-sm font-medium">Benachrichtigungen bei Entfall / Raumänderung</span>
        </div>
        <Button
          onClick={() => (isEnabled ? disable() : enable())}
          variant={isEnabled ? 'outline' : 'primary'}
          disabled={isBusy || classFavorites.length === 0}
        >
          {isEnabled ? 'Deaktivieren' : 'Aktivieren'}
        </Button>
      </div>

      {classFavorites.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Füge zuerst eine Klasse als Favorit hinzu.
        </p>
      )}

      {isEnabled && icsUrl && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={icsUrl}
            className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
          />
          <Button
            variant="icon"
            aria-label="Kalender-Link kopieren"
            onClick={() => {
              navigator.clipboard.writeText(icsUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check className="size-4" strokeWidth={2} /> : <Copy className="size-4" strokeWidth={2} />}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `ClientViewer.tsx`'s selection screen**

In `src/components/ClientViewer.tsx`, add the import near the other component imports (after `import BlacklistModal from './BlacklistModal';`):

```typescript
import NotificationSettings from './NotificationSettings';
```

Then render it just inside `<SelectionMenu ... />`'s closing tag, i.e. change:

```tsx
              onContinue={() => pushStep(router, 'timetable', currentDateStr || getTodayStr(), currentViewMode)}
            />
          </div>
        </section>
```

to:

```tsx
              onContinue={() => pushStep(router, 'timetable', currentDateStr || getTodayStr(), currentViewMode)}
            />
            <NotificationSettings favorites={favorites} />
          </div>
        </section>
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all tests pass (no existing test asserts on `SelectionMenu`'s exact children, so this addition should not break anything — if one does, adjust that test's assertions to allow the new sibling element, don't remove the coverage).

- [ ] **Step 5: Commit**

```bash
git add src/components/NotificationSettings.tsx src/components/ClientViewer.tsx
git commit -m "Add notification settings UI to the selection screen"
```

---

### Task 11: Diff-and-notify worker

**Files:**
- Create: `worker/notify.ts`
- Create: `src/lib/__tests__/notifyDiff.test.ts`
- Modify: `worker/notify.ts` split — see below (pure diff logic is extracted to a testable module)
- Create: `src/lib/server/notifyDiff.ts`

**Interfaces:**
- Consumes: `isCancelledEntry` from `src/lib/timetableEntry.ts` (Task 2); `TimetableWeekData`, `Favorite` from `src/lib/types.ts`.
- Produces: `computeNotifications(week: TimetableWeekData, classes: string[], seen: string[]): Array<{ key: string; title: string; body: string }>` from `src/lib/server/notifyDiff.ts` — the pure, testable diff logic. `worker/notify.ts` is the thin, untested cron/IO wrapper around it (consistent with how Task 9's hook wraps Task 6's tested route).

- [ ] **Step 1: Write the failing test for the pure diff logic**

Create `src/lib/__tests__/notifyDiff.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { computeNotifications } from '../server/notifyDiff';
import { TimetableWeekData } from '../types';

const week: TimetableWeekData = {
  title: 'Stundenplan',
  date: 'Woche vom 1.6 - 5.6',
  currentDateStr: '20260601',
  weekStartStr: '20260601',
  availableClasses: ['9/2'],
  availableRooms: ['313'],
  availableTeachers: ['KNO'],
  days: [
    {
      title: 'Stundenplan',
      date: 'Montag, 1. Juni 2026',
      currentDateStr: '20260601',
      entries: [
        { class: '9/2', hour: '1', subject: 'MA', teacher: 'KNO', room: '313', info: '---' },
        { class: '9/2', hour: '2', subject: 'SPO', teacher: '---', room: '---', info: 'Sport fällt aus' },
        { class: '9/2', hour: '3', subject: 'EN', teacher: 'STZ', room: 'E204', info: 'Raumänderung', roomChanged: true },
        { class: '10/1', hour: '1', subject: 'DE', teacher: 'MEY', room: '311', info: 'fällt aus' },
      ],
      availableClasses: ['9/2', '10/1'],
      availableRooms: ['313', '311', 'E204'],
      availableTeachers: ['KNO', 'MEY', 'STZ'],
    },
  ],
};

describe('computeNotifications', () => {
  it('produces a notification for a cancelled lesson', () => {
    const notifications = computeNotifications(week, ['9/2'], []);
    expect(notifications.some(n => n.key.includes('cancelled') && n.body.includes('SPO'))).toBe(true);
  });

  it('produces a notification for a room change', () => {
    const notifications = computeNotifications(week, ['9/2'], []);
    expect(notifications.some(n => n.key.includes('room') && n.body.includes('EN'))).toBe(true);
  });

  it('does not flag a normal, unchanged lesson', () => {
    const notifications = computeNotifications(week, ['9/2'], []);
    expect(notifications.some(n => n.body.includes('MA'))).toBe(false);
  });

  it('only considers the requested classes', () => {
    const notifications = computeNotifications(week, ['9/2'], []);
    expect(notifications.some(n => n.body.includes('DE'))).toBe(false);
  });

  it('excludes keys already in the seen list', () => {
    const first = computeNotifications(week, ['9/2'], []);
    const seenKeys = first.map(n => n.key);
    const second = computeNotifications(week, ['9/2'], seenKeys);
    expect(second).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/notifyDiff.test.ts`
Expected: FAIL — `Cannot find module '../server/notifyDiff'`

- [ ] **Step 3: Implement the pure diff module**

Create `src/lib/server/notifyDiff.ts`:

```typescript
import { isCancelledEntry } from '../timetableEntry';
import { TimetableWeekData } from '../types';

export interface PlanNotification {
  key: string;
  title: string;
  body: string;
}

export function computeNotifications(
  week: TimetableWeekData,
  classes: string[],
  seen: string[]
): PlanNotification[] {
  const classSet = new Set(classes);
  const seenSet = new Set(seen);
  const notifications: PlanNotification[] = [];

  for (const day of week.days) {
    for (const entry of day.entries) {
      if (!classSet.has(entry.class)) continue;

      if (isCancelledEntry(entry)) {
        const key = `${day.currentDateStr}|${entry.class}|${entry.hour}|cancelled`;
        if (!seenSet.has(key)) {
          notifications.push({
            key,
            title: `${entry.class}: Stunde ${entry.hour} fällt aus`,
            body: `${entry.subject} fällt aus (${day.date}).`,
          });
        }
      } else if (entry.roomChanged) {
        const key = `${day.currentDateStr}|${entry.class}|${entry.hour}|room`;
        if (!seenSet.has(key)) {
          notifications.push({
            key,
            title: `${entry.class}: Raumänderung`,
            body: `${entry.subject} jetzt in Raum ${entry.room} (${day.date}).`,
          });
        }
      }
    }
  }

  return notifications;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/notifyDiff.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Write the worker entrypoint (thin IO wrapper, not unit tested — see Task 13 for the manual smoke test)**

Create `worker/notify.ts`:

```typescript
import cron from 'node-cron';
import webpush from 'web-push';
import { fetchWeekStundenplan } from '../src/lib/stundenplan';
import { listPushSubscribers, markSeen, removePushSubscription } from '../src/lib/server/subscriberStore';
import { computeNotifications } from '../src/lib/server/notifyDiff';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set for the notify worker.');
}

webpush.setVapidDetails('mailto:noreply@timetablex.app', vapidPublicKey, vapidPrivateKey);

async function runOnce() {
  const subscribers = listPushSubscribers();

  for (const subscriber of subscribers) {
    const classes = subscriber.favorites.filter(f => f.mode === 'class').map(f => f.value);
    if (classes.length === 0) continue;

    let week;
    try {
      week = await fetchWeekStundenplan(subscriber.credentials.school, subscriber.credentials.user, subscriber.credentials.pass);
    } catch (error) {
      console.error(`Failed to fetch plan for subscriber ${subscriber.id}:`, error);
      continue;
    }

    const notifications = computeNotifications(week, classes, subscriber.seen);
    if (notifications.length === 0) continue;

    for (const notification of notifications) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscriber.subscription.endpoint,
            keys: { p256dh: subscriber.subscription.p256dh, auth: subscriber.subscription.auth },
          },
          JSON.stringify({ title: notification.title, body: notification.body, url: '/app' })
        );
      } catch (error: any) {
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          removePushSubscription(subscriber.id);
          break;
        }
        console.error(`Failed to send push to subscriber ${subscriber.id}:`, error);
      }
    }

    markSeen(subscriber.id, notifications.map(n => n.key));
  }
}

// Every 15 minutes, Mon–Fri, 06:00–17:00 local time.
cron.schedule('*/15 6-17 * * 1-5', () => {
  runOnce().catch(error => console.error('notify worker run failed:', error));
});

console.log('TimetableX notify worker started.');
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all tests pass. (`worker/notify.ts` is not imported by any test, so it doesn't need to type-check under Vitest's config; it's verified via `tsx --check` in Task 13's smoke test and via the Docker build in Task 12.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/notifyDiff.ts src/lib/__tests__/notifyDiff.test.ts worker/notify.ts
git commit -m "Add diff-and-notify worker for cancellations and room changes"
```

---

### Task 12: Docker and deployment wiring

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `.env.example` (create if it does not already exist under a different name — none was found in the repo, so create it)

**Interfaces:**
- Produces: a `worker` Docker Compose service running `worker/notify.ts` via `tsx`, sharing the built image with `web`, both mounting the same SQLite volume.

- [ ] **Step 1: Update the Dockerfile runner stage to include full `node_modules` and the worker source**

In `Dockerfile`, replace the `runner` stage (lines 19-39):

```dockerfile
# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

with:

```dockerfile
# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The standalone output above only ships the subset of node_modules the
# Next.js server needs. The worker service (Task 12, docker-compose.yml)
# reuses this same image but needs the full dependency set (better-sqlite3,
# web-push, node-cron, tsx) plus the worker/src TypeScript sources.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/worker ./worker
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

- [ ] **Step 2: Rebuild the image locally to confirm the Dockerfile is still valid**

Run: `docker build -t timetablex-test .`
Expected: build succeeds (this also validates `npm run build` still passes inside the container).

- [ ] **Step 3: Add the worker service and shared volume to docker-compose.yml**

Replace the full contents of `docker-compose.yml`:

```yaml
services:
  web:
    image: ghcr.io/xtimetablex/timetablex:latest
    restart: unless-stopped
    env_file: .env
    environment:
      - SQLITE_PATH=/data/timetablex.sqlite
    volumes:
      - sqlite-data:/data
    networks:
      - caddy-public

  worker:
    image: ghcr.io/xtimetablex/timetablex:latest
    restart: unless-stopped
    env_file: .env
    environment:
      - SQLITE_PATH=/data/timetablex.sqlite
    volumes:
      - sqlite-data:/data
    command: ["npx", "tsx", "worker/notify.ts"]
    networks:
      - caddy-public

  watchtower:
    image: containrrr/watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /root/.docker/config.json:/config.json
    command: --interval 60 --cleanup web worker
    networks:
      - caddy-public

networks:
  caddy-public:
    external: true

volumes:
  sqlite-data:
```

- [ ] **Step 4: Document the new required environment variables**

Create `.env.example`:

```
TIMETABLEX_AUTH_SECRET=change-me-to-a-random-secret
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

Note in a comment at the top of the file:

```
# Generate a VAPID key pair with: npx web-push generate-vapid-keys
# VAPID_PUBLIC_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY must be the SAME value
# (server needs it to sign pushes, client needs it to subscribe).
```

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml .env.example
git commit -m "Wire notify worker and SQLite volume into Docker deployment"
```

---

### Task 13: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full type check**

Run: `npm run lint`
Expected: exits 0. `tsconfig.json`'s `include` is `**/*.ts`, so this single command already type-checks `worker/notify.ts` too (it uses relative `../src/lib/...` imports, not the `@/*` path alias, so it type-checks correctly standalone as well as under this project-wide run).

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including every test added in Tasks 2–11.

- [ ] **Step 3: Manual smoke test — demo mode, day view**

```bash
npm run dev
```

Open `http://localhost:3000/app`, log in with school `sample` (any username/password — demo mode per `CLAUDE.md`), select class `5/1` as a favorite, and confirm the "Benachrichtigungen bei Entfall / Raumänderung" panel appears below the favorites with an "Aktivieren" button.

- [ ] **Step 4: Manual smoke test — enable notifications and confirm the ics link works**

Click "Aktivieren", accept the browser's notification permission prompt (self-signed VAPID keys generated via `npx web-push generate-vapid-keys` and placed in `.env.local` are required for this to succeed locally — `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`). Confirm the panel now shows a copyable `.ics` URL. Open that URL directly in the browser and confirm it downloads/displays a `BEGIN:VCALENDAR` document containing an event for `5/1`'s lessons.

- [ ] **Step 5: Manual smoke test — worker runs without crashing**

```bash
SQLITE_PATH=./data/timetablex.sqlite VAPID_PUBLIC_KEY=<from step 4> VAPID_PRIVATE_KEY=<from step 4> npx tsx worker/notify.ts
```

Expected: prints `TimetableX notify worker started.` and does not crash. Stop it with Ctrl+C — it does not need to fire a real notification in this smoke test (that requires waiting for the cron schedule or a real cancelled lesson), just confirm it starts, connects to SQLite, and the `listPushSubscribers()` call from Step 4's browser session doesn't throw.

- [ ] **Step 6: Report results**

Summarize pass/fail for each of Steps 1-5 back to the user before considering this plan complete.
