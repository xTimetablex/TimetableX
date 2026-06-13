# Public Timetable API

## Problem

The only way to fetch timetable data programmatically today is the raw
stundenplan24.de XML API
(`https://www.stundenplan24.de/{school}/wplan/wdatenk/WPlanKl_{YYYYMMDD}.xml`,
HTTP Basic Auth, `YYYYMMDD` dates, full-day XML for every class). It's
awkward to use from `curl`/Postman: XML output, no filtering by
class/room/teacher, no week support in one call, and an unfriendly date
format.

We want a small public, stateless JSON endpoint that's easy to call directly,
e.g. "give me class 9/2 on 16.6.26, here's my login".

## Endpoint

`GET /api/public/timetable`

Stateless and independent of the existing cookie-session login
(`/api/auth`, `src/lib/server/authSession.ts`). Callers authenticate on every
request via HTTP Basic Auth — no prior login call needed.

## Auth

HTTP Basic Auth, where:

- **username** = `<schoolNumber>.<stundenplan24Username>` — split on the
  *first* `.` (school numbers are numeric, so this is unambiguous)
- **password** = stundenplan24 password

```
curl -u '12345.jdoe:secret' \
  'https://your-app/api/public/timetable?class=9/2&date=16.6.2026'
```

Error responses:

| Condition | Status | Body |
|---|---|---|
| Missing/non-Basic `Authorization` header | `401` + `WWW-Authenticate: Basic realm="TimetableX Public API"` | `{ "error": "Authentifizierung erforderlich (Basic Auth: SCHULNUMMER.BENUTZERNAME:PASSWORT)." }` |
| Username has no `.` separator | same as above | same message |
| stundenplan24.de rejects credentials | `401` | `{ "error": "Ungültiger Benutzername oder Passwort." }` |

**Demo mode:** `school` of `sample` or `demo` (e.g. `curl -u 'sample.x:x' ...`)
returns the existing `SAMPLE_DATA` from `src/lib/stundenplan.ts`, filtered
like real data — no real credentials needed for testing/docs.

## Query parameters

| param | required | values | default |
|---|---|---|---|
| `date` | no | German format `D.M.YYYY` or `D.M.YY`, day/month 1 or 2 digits, 2-digit year → `20YY`, e.g. `16.6.2026`, `16.06.2026`, `16.6.26`, `16.06.26` | today |
| `view` | no | `day` \| `week` | `day` |
| `class` / `room` / `teacher` | no, **at most one** | filter value, e.g. `class=9/2` | none (unfiltered) |

Validation errors (all `400` with `{ "error": "..." }`):

- `date` doesn't parse as `D.M.YYYY`/`D.M.YY`
- `view` is something other than `day`/`week`
- more than one of `class`/`room`/`teacher` is present

## Response shapes

All entries use the existing `TimetableEntry` shape (`hour`, `subject`,
`teacher`, `room`, `info`, `class`, plus the `*Changed` flags), sorted by
`hour` ascending.

**Day view, filtered** (`?class=9/2&date=16.6.2026`):

```json
{
  "class": "9/2",
  "date": "Dienstag, 16. Juni 2026 (Aktualisiert: 14:32)",
  "dateStr": "20260616",
  "entries": [
    { "hour": "4", "subject": "CH", "teacher": "HIN", "room": "328", "info": "...", "class": "9/2" }
  ]
}
```

**Day view, unfiltered**: same shape, `class`/`room`/`teacher` key omitted,
`entries` contains every class for that day.

**Week view** (`?class=9/2&view=week`):

```json
{
  "class": "9/2",
  "days": [
    { "date": "Montag, 15. Juni 2026 (...)", "dateStr": "20260615", "entries": [...] },
    { "date": "Dienstag, 16. Juni 2026 (...)", "dateStr": "20260616", "entries": [...] },
    { "date": "...", "dateStr": "...", "entries": [...] },
    { "date": "...", "dateStr": "...", "entries": [...] },
    { "date": "...", "dateStr": "...", "entries": [...] }
  ]
}
```

Week view, unfiltered: same, `class`/`room`/`teacher` key omitted.

`dayNotes?: string[]` and `isWeekend?: boolean` are passed through onto each
day object when `TimetableData` provides them.

## Other errors

| Condition | Status | Body |
|---|---|---|
| Upstream fetch fails for a non-auth reason | `502` | `{ "error": "Verbindung zum Server fehlgeschlagen." }` |
| Unexpected error | `500` | `{ "error": "<message>" }` |

## Implementation

**New files:**

- `src/app/api/public/timetable/route.ts` — `GET` handler:
  1. `parseBasicAuth(request)` → `Credentials | null`; `null` → 401 +
     `WWW-Authenticate`
  2. Zod-validate query params (`date`, `view`, at most one of
     `class`/`room`/`teacher`)
  3. `parseGermanDateStr(date)` → `YYYYMMDD` or `null` → 400 if invalid
  4. Call `fetchStundenplan` or `fetchWeekStundenplan`
     (`src/lib/stundenplan.ts`) depending on `view`
  5. Filter each day's `entries` via `filterEntries` (`blacklist: []`) if a
     filter param was given, else pass through sorted by `hour`
  6. Shape the response per the tables above

- `src/lib/server/publicAuth.ts`:
  - `parseBasicAuth(request: Request): Credentials | null` — decodes the
    `Authorization: Basic ...` header, splits the username on the first `.`
    into `school` and `user`
  - `unauthorizedResponse(message: string): NextResponse` — `401` JSON body
    plus `WWW-Authenticate: Basic realm="TimetableX Public API"`

**Modified files:**

- `src/lib/date.ts` — add:
  ```ts
  export function parseGermanDateStr(input: string): string | null
  ```
  Parses `D.M.YYYY` or `D.M.YY` (day/month 1 or 2 digits, 2-digit year →
  `20YY`), returns `YYYYMMDD` or `null` for anything that doesn't
  match/parse.

**Reused as-is:**

- `fetchStundenplan` / `fetchWeekStundenplan` (`src/lib/stundenplan.ts`) —
  already handle `sample`/`demo` school and produce
  `TimetableData`/`TimetableWeekData`, including `dayNotes`/`isWeekend`
- `filterEntries` (`src/lib/hooks/useTimetable.ts`) — called with
  `blacklist: []`; filters by class/room/teacher and sorts by `hour`

## Testing

- `date.test.ts` — add cases for `parseGermanDateStr`: valid `D.M.YYYY`,
  valid `D.M.YY` (2-digit year mapping), invalid strings (wrong separator,
  non-numeric, out-of-range day/month) → `null`
- New `publicAuth.test.ts` — `parseBasicAuth`: valid header → `Credentials`;
  missing header → `null`; non-Basic scheme → `null`; username without `.`
  → `null`; malformed base64 → `null`
- New route test (`src/app/api/public/timetable/route.test.ts` or under
  `src/lib/__tests__/`) using `sample.x:x` credentials (no network required):
  - filtered day view returns only matching entries
  - unfiltered day view returns all entries, `class`/`room`/`teacher` key
    absent
  - week view returns 5 day objects
  - missing `Authorization` → `401` with `WWW-Authenticate` header
  - `class` + `room` together → `400`
  - invalid `date` → `400`

## Out of scope

- No changes to the existing cookie-session auth (`/api/auth`,
  `/api/stundenplan`, `/api/subjects`) — this is a fully separate endpoint
- No rate limiting (matches existing API routes)
- No CORS configuration (curl/Postman don't need it; can be added later if a
  browser-based consumer appears)
- No blacklist support (blacklist is per-browser `localStorage` state, not
  applicable to a stateless API)
