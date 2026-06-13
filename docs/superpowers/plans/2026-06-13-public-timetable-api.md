# Public Timetable API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stateless `GET /api/public/timetable` endpoint, authenticated via HTTP Basic Auth (`SCHULNUMMER.BENUTZERNAME:PASSWORT`), that returns timetable entries as JSON, optionally filtered by class/room/teacher and for a single day or a full week, accepting German-format dates.

**Architecture:** A new Basic-Auth parsing helper (`src/lib/server/publicAuth.ts`) extracts `{ school, user, pass }` from the `Authorization` header. A new date helper (`parseGermanDateStr` in `src/lib/date.ts`) converts `D.M.YYYY`/`D.M.YY` to the internal `YYYYMMDD` format. The route handler (`src/app/api/public/timetable/route.ts`) wires these together with the existing `fetchStundenplan`/`fetchWeekStundenplan` and `filterEntries`, with no changes to the existing cookie-session auth or internal `/api/stundenplan` route.

**Tech Stack:** Next.js 15 App Router route handler, Zod for query validation, Vitest for tests.

---

## Reference: full design spec

See `docs/superpowers/specs/2026-06-13-public-timetable-api-design.md` for the complete API contract (auth, query params, response shapes, error table). This plan implements that spec exactly; refer back to it if a step seems ambiguous.

---

### Task 1: German date parsing (`parseGermanDateStr`)

**Files:**
- Modify: `src/lib/date.ts`
- Modify: `src/lib/__tests__/date.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/__tests__/date.test.ts`, update the import at the top of the file to include `parseGermanDateStr`:

```ts
import {
  formatDateStr,
  parseDateStr,
  parseGermanDateStr,
  addDays,
  getWeekStart,
  getWeekDates,
  formatWeekLabel,
  getTodayStr,
  formatDayLabel,
} from '../date';
```

Then append this new `describe` block at the end of the file:

```ts
describe('parseGermanDateStr', () => {
  it('parses D.M.YYYY', () => {
    expect(parseGermanDateStr('16.6.2026')).toBe('20260616');
  });

  it('parses zero-padded D.M.YYYY', () => {
    expect(parseGermanDateStr('16.06.2026')).toBe('20260616');
  });

  it('parses D.M.YY with a 2-digit year', () => {
    expect(parseGermanDateStr('16.6.26')).toBe('20260616');
  });

  it('parses single-digit day and month', () => {
    expect(parseGermanDateStr('1.1.26')).toBe('20260101');
  });

  it('returns null for day 31 in a 30-day month', () => {
    expect(parseGermanDateStr('31.4.2026')).toBeNull();
  });

  it('returns null for month > 12', () => {
    expect(parseGermanDateStr('15.13.2026')).toBeNull();
  });

  it('returns null for day > 31', () => {
    expect(parseGermanDateStr('32.1.2026')).toBeNull();
  });

  it('returns null for day or month 0', () => {
    expect(parseGermanDateStr('0.1.2026')).toBeNull();
    expect(parseGermanDateStr('1.0.2026')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseGermanDateStr('abc')).toBeNull();
  });

  it('returns null for ISO format', () => {
    expect(parseGermanDateStr('2026-06-16')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test src/lib/__tests__/date.test.ts`
Expected: FAIL — `parseGermanDateStr` is not exported from `../date`.

- [ ] **Step 3: Implement `parseGermanDateStr`**

In `src/lib/date.ts`, insert this new exported function directly after `parseDateStr` (after its closing `}`, before `export function getTodayStr`):

```ts
const GERMAN_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/;

export function parseGermanDateStr(input: string): string | null {
  const match = GERMAN_DATE_RE.exec(input.trim());
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);
  if (match[3].length === 2) year += 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return formatDateStr(date);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test src/lib/__tests__/date.test.ts`
Expected: PASS (all `parseGermanDateStr` cases plus the existing date tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/date.ts src/lib/__tests__/date.test.ts
git commit -m "Add parseGermanDateStr for D.M.YYYY/D.M.YY date input"
```

---

### Task 2: Basic Auth parsing helper

**Files:**
- Create: `src/lib/server/publicAuth.ts`
- Create: `src/lib/__tests__/publicAuth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/publicAuth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { AUTH_ERROR_MESSAGE, parseBasicAuth, unauthorizedResponse } from '../server/publicAuth';

function basicAuthHeader(value: string): string {
  return `Basic ${Buffer.from(value).toString('base64')}`;
}

function withAuth(value: string): Request {
  return new Request('https://example.test/api/public/timetable', {
    headers: { authorization: basicAuthHeader(value) },
  });
}

describe('parseBasicAuth', () => {
  it('parses school, user, and pass from school.user:pass', () => {
    expect(parseBasicAuth(withAuth('12345.jdoe:secret'))).toEqual({
      school: '12345',
      user: 'jdoe',
      pass: 'secret',
    });
  });

  it('splits the username on the first dot only', () => {
    expect(parseBasicAuth(withAuth('12345.j.doe:secret'))).toEqual({
      school: '12345',
      user: 'j.doe',
      pass: 'secret',
    });
  });

  it('allows colons in the password', () => {
    expect(parseBasicAuth(withAuth('12345.jdoe:sec:ret'))).toEqual({
      school: '12345',
      user: 'jdoe',
      pass: 'sec:ret',
    });
  });

  it('returns null when the Authorization header is missing', () => {
    const request = new Request('https://example.test/api/public/timetable');
    expect(parseBasicAuth(request)).toBeNull();
  });

  it('returns null for a non-Basic scheme', () => {
    const request = new Request('https://example.test/api/public/timetable', {
      headers: { authorization: 'Bearer sometoken' },
    });
    expect(parseBasicAuth(request)).toBeNull();
  });

  it('returns null when the username has no school separator', () => {
    expect(parseBasicAuth(withAuth('jdoe:secret'))).toBeNull();
  });

  it('returns null for malformed base64', () => {
    const request = new Request('https://example.test/api/public/timetable', {
      headers: { authorization: 'Basic ???' },
    });
    expect(parseBasicAuth(request)).toBeNull();
  });
});

describe('unauthorizedResponse', () => {
  it('returns a 401 with a WWW-Authenticate header and error body', async () => {
    const response = unauthorizedResponse();

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="TimetableX Public API"');
    await expect(response.json()).resolves.toEqual({ error: AUTH_ERROR_MESSAGE });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test src/lib/__tests__/publicAuth.test.ts`
Expected: FAIL — cannot find module `../server/publicAuth`.

- [ ] **Step 3: Implement `publicAuth.ts`**

Create `src/lib/server/publicAuth.ts`:

```ts
import { NextResponse } from 'next/server';
import { Credentials } from '@/lib/types';

export const AUTH_ERROR_MESSAGE =
  'Authentifizierung erforderlich (Basic Auth: SCHULNUMMER.BENUTZERNAME:PASSWORT).';

export function parseBasicAuth(request: Request): Credentials | null {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Basic ')) return null;

  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return null;

  const username = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);

  const dotIndex = username.indexOf('.');
  if (dotIndex === -1) return null;

  const school = username.slice(0, dotIndex);
  const user = username.slice(dotIndex + 1);
  if (!school || !user || !pass) return null;

  return { school, user, pass };
}

export function unauthorizedResponse(): NextResponse {
  const response = NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });
  response.headers.set('WWW-Authenticate', 'Basic realm="TimetableX Public API"');
  return response;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test src/lib/__tests__/publicAuth.test.ts`
Expected: PASS (all 8 cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/publicAuth.ts src/lib/__tests__/publicAuth.test.ts
git commit -m "Add Basic Auth parsing helper for the public timetable API"
```

---

### Task 3: Public timetable route

**Files:**
- Create: `src/app/api/public/timetable/route.ts`
- Create: `src/lib/__tests__/publicTimetableRoute.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/publicTimetableRoute.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GET } from '../../app/api/public/timetable/route';

function basicAuthHeader(value: string): string {
  return `Basic ${Buffer.from(value).toString('base64')}`;
}

function request(query: string, auth = 'sample.x:x'): Request {
  return new Request(`https://example.test/api/public/timetable${query}`, {
    headers: { authorization: basicAuthHeader(auth) },
  });
}

describe('GET /api/public/timetable', () => {
  it('returns filtered entries for a class', async () => {
    const response = await GET(request('?class=9/2'));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.class).toBe('9/2');
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].subject).toBe('CH');
  });

  it('returns filtered entries for a room', async () => {
    const response = await GET(request('?room=313'));
    const body = await response.json();

    expect(body.room).toBe('313');
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].subject).toBe('MA');
  });

  it('returns all entries sorted by hour when no filter is given', async () => {
    const response = await GET(request(''));
    const body = await response.json();

    expect(body.class).toBeUndefined();
    expect(body.room).toBeUndefined();
    expect(body.teacher).toBeUndefined();
    expect(body.entries.map((e: { hour: string }) => e.hour)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('returns 5 days for week view', async () => {
    const response = await GET(request('?class=9/2&view=week'));
    const body = await response.json();

    expect(body.class).toBe('9/2');
    expect(body.days).toHaveLength(5);
    expect(body.days[0].entries).toHaveLength(1);
    expect(body.days[0].entries[0].subject).toBe('CH');
  });

  it('accepts a German-format date', async () => {
    const response = await GET(request('?class=9/2&date=16.6.2026'));
    expect(response.status).toBe(200);
  });

  it('returns 401 with WWW-Authenticate when the Authorization header is missing', async () => {
    const response = await GET(new Request('https://example.test/api/public/timetable'));

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="TimetableX Public API"');
  });

  it('returns 400 when more than one filter is given', async () => {
    const response = await GET(request('?class=9/2&room=313'));
    expect(response.status).toBe(400);
  });

  it('returns 400 for an invalid date', async () => {
    const response = await GET(request('?date=31.4.2026'));
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test src/lib/__tests__/publicTimetableRoute.test.ts`
Expected: FAIL — cannot find module `../../app/api/public/timetable/route`.

- [ ] **Step 3: Implement the route handler**

Create `src/app/api/public/timetable/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseGermanDateStr } from '@/lib/date';
import { filterEntries } from '@/lib/hooks/useTimetable';
import { parseBasicAuth, unauthorizedResponse } from '@/lib/server/publicAuth';
import { fetchStundenplan, fetchWeekStundenplan } from '@/lib/stundenplan';
import { FilterMode, TimetableData } from '@/lib/types';

const QuerySchema = z.object({
  date: z.string().optional(),
  view: z.enum(['day', 'week']).optional(),
  class: z.string().optional(),
  room: z.string().optional(),
  teacher: z.string().optional(),
});

type Filter = { mode: FilterMode; value: string };

function shapeDay(day: TimetableData, filter: Filter | null) {
  const entries = filter
    ? filterEntries(day.entries, filter.mode, filter.value, [])
    : [...day.entries].sort((a, b) => (parseInt(a.hour) || 0) - (parseInt(b.hour) || 0));

  return {
    date: day.date,
    dateStr: day.currentDateStr,
    entries,
    ...(day.dayNotes ? { dayNotes: day.dayNotes } : {}),
    ...(day.isWeekend ? { isWeekend: day.isWeekend } : {}),
  };
}

export async function GET(request: Request) {
  const credentials = parseBasicAuth(request);
  if (!credentials) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const result = QuerySchema.safeParse({
    date: searchParams.get('date') ?? undefined,
    view: searchParams.get('view') ?? undefined,
    class: searchParams.get('class') ?? undefined,
    room: searchParams.get('room') ?? undefined,
    teacher: searchParams.get('teacher') ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { date, view, class: classFilter, room: roomFilter, teacher: teacherFilter } = result.data;

  const filters: Filter[] = [];
  if (classFilter) filters.push({ mode: 'class', value: classFilter });
  if (roomFilter) filters.push({ mode: 'room', value: roomFilter });
  if (teacherFilter) filters.push({ mode: 'teacher', value: teacherFilter });

  if (filters.length > 1) {
    return NextResponse.json(
      { error: 'Nur einer von class, room oder teacher darf angegeben werden.' },
      { status: 400 }
    );
  }
  const filter = filters[0] ?? null;

  let dateStr: string | undefined;
  if (date) {
    const parsed = parseGermanDateStr(date);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Ungültiges Datum (erwartet: T.M.JJJJ).' },
        { status: 400 }
      );
    }
    dateStr = parsed;
  }

  const { school, user, pass } = credentials;
  const filterField = filter ? { [filter.mode]: filter.value } : {};

  try {
    if (view === 'week') {
      const weekData = await fetchWeekStundenplan(school, user, pass, dateStr);
      return NextResponse.json({
        ...filterField,
        days: weekData.days.map(day => shapeDay(day, filter)),
      });
    }

    const dayData = await fetchStundenplan(school, user, pass, dateStr);
    return NextResponse.json({
      ...filterField,
      ...shapeDay(dayData, filter),
    });
  } catch (e: any) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('Ungültig')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.includes('Verbindung')) {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json({ error: message || 'Interner Serverfehler.' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test src/lib/__tests__/publicTimetableRoute.test.ts`
Expected: PASS (all 8 cases).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/public/timetable/route.ts src/lib/__tests__/publicTimetableRoute.test.ts
git commit -m "Add GET /api/public/timetable endpoint"
```

---

### Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `bun run test`
Expected: PASS — all existing tests plus the new ones from Tasks 1-3.

- [ ] **Step 2: Run the type checker**

Run: `bun run lint`
Expected: PASS — `tsc --noEmit` reports no errors.

- [ ] **Step 3: Start the dev server**

Run: `bun run dev` (in the background, e.g. a separate terminal or with `run_in_background`)
Expected: Server listening on `http://localhost:3000` (or printed port).

- [ ] **Step 4: Manually exercise the endpoint with curl using demo data**

```bash
# Filtered by class, day view
curl -s -u 'sample.x:x' 'http://localhost:3000/api/public/timetable?class=9/2' | jq .

# Filtered by room, German date
curl -s -u 'sample.x:x' 'http://localhost:3000/api/public/timetable?room=313&date=16.6.2026' | jq .

# Unfiltered day view
curl -s -u 'sample.x:x' 'http://localhost:3000/api/public/timetable' | jq .

# Week view
curl -s -u 'sample.x:x' 'http://localhost:3000/api/public/timetable?class=9/2&view=week' | jq .

# Missing auth -> 401 + WWW-Authenticate
curl -i -s 'http://localhost:3000/api/public/timetable' | head -n 5

# Conflicting filters -> 400
curl -s -u 'sample.x:x' 'http://localhost:3000/api/public/timetable?class=9/2&room=313' | jq .

# Invalid date -> 400
curl -s -u 'sample.x:x' 'http://localhost:3000/api/public/timetable?date=31.4.2026' | jq .
```

Expected: responses match the shapes in
`docs/superpowers/specs/2026-06-13-public-timetable-api-design.md` — filtered
responses include the `class`/`room`/`teacher` echo field, week view returns
`days: [...]` with 5 entries, missing auth returns `WWW-Authenticate: Basic
realm="TimetableX Public API"`, and the last two requests return `400`.

- [ ] **Step 5: Stop the dev server**

Stop the background `bun run dev` process.
