# Public Timetable API

## Overview

`GET /api/public/timetable` is a stateless, public JSON endpoint for fetching
substitution timetable data. It's intended for external consumers — `curl`,
Postman, scripts — that want timetable data without using the app's UI or
cookie-session login.

Every request is authenticated independently via HTTP Basic Auth. There is no
login step and no session/cookie state; each request stands on its own.

## Authentication

The endpoint uses **HTTP Basic Auth**:

- **Username**: `<schoolNumber>.<stundenplan24Username>` — the school number
  and your stundenplan24.de username, joined with a `.` (split on the
  *first* `.`, since school numbers are numeric and unambiguous)
- **Password**: your stundenplan24.de password

```bash
curl -u '12345.jdoe:secret' \
  'https://your-app/api/public/timetable?class=9/2&date=16.6.2026'
```

### Demo mode

Pass `sample` or `demo` as the school number to get fixed sample data without
real credentials — useful for testing and documentation:

```bash
curl -u 'sample.x:x' \
  'https://your-app/api/public/timetable?class=9/2'
```

(The username and password after the school number can be anything — they're
not checked in demo mode.)

## Query parameters

| Parameter | Required | Values | Default |
|---|---|---|---|
| `date` | no | German date format `D.M.YYYY` or `D.M.YY` — day and month may be 1 or 2 digits, a 2-digit year is mapped to `20YY`. Examples: `16.6.2026`, `16.06.2026`, `16.6.26`, `16.06.26` | today |
| `view` | no | `day` \| `week` | `day` |
| `class` | no | a class name, e.g. `9/2` | unfiltered |
| `room` | no | a room name, e.g. `313` | unfiltered |
| `teacher` | no | a teacher abbreviation, e.g. `HIN` | unfiltered |

`class`, `room`, and `teacher` are **mutually exclusive** — provide at most
one. If none are given, the response includes all entries for the
day/week, sorted by `hour` ascending.

## Response shapes

All timetable entries use the `TimetableEntry` shape:

| Field | Type | Description |
|---|---|---|
| `class` | `string` | Class name, e.g. `"9/2"` |
| `hour` | `string` | Lesson/period number, e.g. `"4"` |
| `subject` | `string` | Subject abbreviation, e.g. `"CH"` |
| `teacher` | `string` | Teacher abbreviation, e.g. `"HIN"` |
| `room` | `string` | Room name, e.g. `"328"` |
| `info` | `string` | Free-text note (substitution info), or `"---"` if none |
| `roomChanged?` | `boolean` | Present and `true` if the room was changed |
| `teacherChanged?` | `boolean` | Present and `true` if the teacher was changed |
| `subjectChanged?` | `boolean` | Present and `true` if the subject was changed |
| `hourChanged?` | `boolean` | Present and `true` if the hour was changed |

The `*Changed` flags are only present (and `true`) when the corresponding
field reflects a substitution; otherwise they're omitted.

### Day view, filtered

`GET /api/public/timetable?class=9/2`

```json
{
  "class": "9/2",
  "date": "Montag, 30. März 2026 (Beispieldaten)",
  "dateStr": "20260330",
  "entries": [
    {
      "class": "9/2",
      "hour": "4",
      "subject": "CH",
      "teacher": "HIN",
      "room": "328",
      "info": "Klassenänderung: Kurs 9/2+9/3"
    }
  ]
}
```

When a filter (`class`, `room`, or `teacher`) is given, the response includes
a top-level key with that name and value (e.g. `"class": "9/2"`), and
`entries` contains only the matching, `hour`-sorted entries.

### Day view, unfiltered

`GET /api/public/timetable`

Same shape, but the `class`/`room`/`teacher` key is omitted and `entries`
contains every entry for the day (across all classes), sorted by `hour`:

```json
{
  "date": "Montag, 30. März 2026 (Beispieldaten)",
  "dateStr": "20260330",
  "entries": [
    {
      "class": "5/1",
      "hour": "1",
      "subject": "MA",
      "teacher": "KNO",
      "room": "313",
      "info": "---"
    },
    {
      "class": "5/1",
      "hour": "2",
      "subject": "DE",
      "teacher": "MEY",
      "room": "311",
      "info": "Vertretung für AUE",
      "teacherChanged": true
    },
    {
      "class": "5/1",
      "hour": "3",
      "subject": "EN",
      "teacher": "STZ",
      "room": "E204",
      "info": "Raumänderung: Zimmer E204",
      "roomChanged": true
    },
    {
      "class": "9/2",
      "hour": "4",
      "subject": "CH",
      "teacher": "HIN",
      "room": "328",
      "info": "Klassenänderung: Kurs 9/2+9/3"
    },
    {
      "class": "10/1",
      "hour": "5",
      "subject": "SPO",
      "teacher": "---",
      "room": "---",
      "info": "Sport fällt aus"
    }
  ]
}
```

If the upstream data includes day-level notes or marks the day as a weekend,
two optional fields are added to the day object:

- `dayNotes?: string[]` — free-text notes for the day
- `isWeekend?: boolean` — `true` if the date falls on a weekend

### Week view, filtered

`GET /api/public/timetable?class=9/2&view=week`

```json
{
  "class": "9/2",
  "days": [
    {
      "date": "Montag, 30. März 2026 (Beispieldaten)",
      "dateStr": "20260330",
      "entries": [
        {
          "class": "9/2",
          "hour": "4",
          "subject": "CH",
          "teacher": "HIN",
          "room": "328",
          "info": "Klassenänderung: Kurs 9/2+9/3"
        }
      ]
    },
    { "...": "4 more day objects, same shape" }
  ]
}
```

`days` always has 5 entries (Monday through Friday of the week containing
`date`, or the current week if `date` is omitted). Each day object has the
same shape as the day view (`date`, `dateStr`, `entries`, and optional
`dayNotes`/`isWeekend`).

With real credentials, each day reflects that date's actual timetable data.
**In demo mode** (`sample`/`demo`), the 5 `days` entries are all identical —
the sample data is a single fixed day, returned regardless of the requested
date.

### Week view, unfiltered

`GET /api/public/timetable?view=week`

Same as above, but the `class`/`room`/`teacher` key is omitted and each day's
`entries` contains every entry for that day.

## Errors

All error responses are `{ "error": "<message>" }` with the German message
text produced by the server.

| Condition | Status | Body | Notes |
|---|---|---|---|
| Missing or non-Basic `Authorization` header, or username has no `.` separator | `401` | `{ "error": "Authentifizierung erforderlich (Basic Auth: SCHULNUMMER.BENUTZERNAME:PASSWORT)." }` | Response also includes `WWW-Authenticate: Basic realm="TimetableX Public API"` |
| `view` is something other than `day`/`week` | `400` | `{ "error": "Invalid option: expected one of \"day\"|\"week\"" }` | Zod validation error |
| More than one of `class`/`room`/`teacher` is present | `400` | `{ "error": "Nur einer von class, room oder teacher darf angegeben werden." }` | |
| `date` doesn't parse as `D.M.YYYY` / `D.M.YY` | `400` | `{ "error": "Ungültiges Datum (erwartet: T.M.JJJJ)." }` | e.g. `31.4.2026` (April has 30 days) |
| stundenplan24.de rejects the credentials | `401` | `{ "error": "Ungültiger Benutzername oder Passwort." }` | |
| Upstream connection to stundenplan24.de fails | `502` | `{ "error": "Verbindung zum Server fehlgeschlagen." }` | |
| Unexpected/internal error | `500` | `{ "error": "<message>" }` (falls back to `"Interner Serverfehler."` if no message) | |

## Quickstart examples

Filtered day view for a class, in demo mode:

```bash
curl -u 'sample.x:x' \
  'https://your-app/api/public/timetable?class=9/2'
```

Unfiltered day view for a specific date:

```bash
curl -u '12345.jdoe:secret' \
  'https://your-app/api/public/timetable?date=16.6.2026'
```

Week view filtered by room:

```bash
curl -u '12345.jdoe:secret' \
  'https://your-app/api/public/timetable?room=313&view=week'
```

Week view filtered by teacher, for a given date:

```bash
curl -u '12345.jdoe:secret' \
  'https://your-app/api/public/timetable?teacher=HIN&view=week&date=15.6.2026'
```

Unfiltered week view in demo mode:

```bash
curl -u 'sample.x:x' \
  'https://your-app/api/public/timetable?view=week'
```
