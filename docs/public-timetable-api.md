# TimetableX Public API — Client Guide

How to call the public timetable endpoint from the command line (`curl`) or a
GUI REST client (Yaak, Postman, Insomnia, Bruno, …).

---

## Authentication

Every request uses **HTTP Basic Auth** — no login step, no session cookies.
Each request is self-contained.

| Part | Value |
|------|-------|
| **Username** | `<schoolNumber>.<stundenplan24Username>` |
| **Password** | your stundenplan24.de password |

**Demo mode** — use `sample` (or `demo`) as the school number to get fixed
sample data without real credentials. The rest of the username and the
password can be anything:

```
Username: sample.x
Password: x
```

---

## curl

### Setup

No install required — curl ships with macOS and most Linux distros.
On Windows, it's available in PowerShell 7+ and Git Bash.

Pass credentials with `-u`:

```bash
curl -u 'USERNAME:PASSWORD' 'https://your-app/api/public/timetable'
```

> **Windows CMD note:** use double quotes instead of single quotes:
> `curl -u "sample.x:x" "https://your-app/..."`

### Examples

**Demo — filtered day view for a class**
```bash
curl -u 'sample.x:x' \
  'https://your-app/api/public/timetable?class=9/2'
```

**Demo — unfiltered week view**
```bash
curl -u 'sample.x:x' \
  'https://your-app/api/public/timetable?view=week'
```

**Real credentials — specific date, filtered by class**
```bash
curl -u '12345.jdoe:secret' \
  'https://your-app/api/public/timetable?class=9/2&date=16.6.2026'
```

**Real credentials — week view filtered by room**
```bash
curl -u '12345.jdoe:secret' \
  'https://your-app/api/public/timetable?room=313&view=week'
```

**Real credentials — week view filtered by teacher**
```bash
curl -u '12345.jdoe:secret' \
  'https://your-app/api/public/timetable?teacher=HIN&view=week&date=15.6.2026'
```

### Pretty-printing the response

Pipe through `jq` for readable JSON:

```bash
curl -s -u 'sample.x:x' \
  'https://your-app/api/public/timetable?class=9/2' | jq .
```

(`-s` suppresses the progress bar so only JSON goes to stdout.)

---

## Yaak

### One-time setup

1. **New Request** → Method `GET`
2. URL: `https://your-app/api/public/timetable`
3. **Auth** tab → Type: **Basic Auth**
   - Username: `sample.x`
   - Password: `x`

### Query parameters

Open the **Query** tab and add rows as needed:

| Key | Example | Notes |
|-----|---------|-------|
| `class` | `9/2` | mutually exclusive with `room`/`teacher` |
| `room` | `313` | mutually exclusive with `class`/`teacher` |
| `teacher` | `HIN` | mutually exclusive with `class`/`room` |
| `view` | `week` | omit for day view (default) |
| `date` | `16.6.2026` | German format `D.M.YYYY`; omit for today |

Toggle rows on/off without deleting them using the checkbox next to each row —
useful for switching between filtered and unfiltered requests.

### Environments (recommended)

Set up two environments to avoid copy-pasting credentials:

**`Demo` environment**
| Variable | Value |
|----------|-------|
| `base_url` | `https://your-app` |
| `username` | `sample.x` |
| `password` | `x` |

**`Production` environment**
| Variable | Value |
|----------|-------|
| `base_url` | `https://your-app` |
| `username` | `12345.jdoe` |
| `password` | `secret` |

Then in the request:
- URL: `{{ base_url }}/api/public/timetable`
- Basic Auth Username: `{{ username }}`
- Basic Auth Password: `{{ password }}`

Switch environments from the dropdown in the top bar to flip between demo and
real credentials instantly.

---

## Postman

### One-time setup

1. **New** → **HTTP Request** → Method `GET`
2. URL: `https://your-app/api/public/timetable`
3. **Authorization** tab → Type: **Basic Auth**
   - Username: `sample.x`
   - Password: `x`

### Query parameters

In the **Params** tab, add key/value rows (same table as Yaak above).
Uncheck rows to disable them without removing them.

### Environments (recommended)

1. **Environments** (top-right gear icon) → **Add**
2. Name it `TimetableX Demo` and add variables:
   - `base_url` → `https://your-app`
   - `username` → `sample.x`
   - `password` → `x`
3. Repeat for `TimetableX Production` with real values.
4. In the request, use `{{base_url}}`, `{{username}}`, `{{password}}`.
5. Select the active environment from the top-right dropdown.

### Collection (optional)

Group your requests into a **Collection** and set the Basic Auth credentials
at the collection level under **Authorization** → **Inherit auth from parent**
on each request. That way you only update credentials in one place.

---

## Insomnia

### One-time setup

1. **New HTTP Request** → `GET`
2. URL: `https://your-app/api/public/timetable`
3. **Auth** tab → **Basic Auth**
   - Username: `sample.x`
   - Password: `x`

### Query parameters

Use the **Query** tab — same fields as above.

### Environments

**Base Environment** (applies everywhere):
```json
{
  "base_url": "https://your-app"
}
```

**Sub-environment `Demo`:**
```json
{
  "username": "sample.x",
  "password": "x"
}
```

**Sub-environment `Production`:**
```json
{
  "username": "12345.jdoe",
  "password": "secret"
}
```

Reference them in the request as `{{ _.base_url }}`, `{{ _.username }}`,
`{{ _.password }}`.

---

## Query parameter reference

| Parameter | Required | Default | Notes |
|-----------|----------|---------|-------|
| `class` | no | — | e.g. `9/2` |
| `room` | no | — | e.g. `313` |
| `teacher` | no | — | e.g. `HIN` |
| `view` | no | `day` | `day` or `week` |
| `date` | no | today | German format: `D.M.YYYY` (e.g. `16.6.2026`) |

`class`, `room`, and `teacher` are **mutually exclusive** — use at most one.
Omitting all three returns all entries for the day/week.

---

## Error reference

| Status | Meaning | Fix |
|--------|---------|-----|
| `401` | Missing/invalid auth, or username has no `.` separator | Check your Basic Auth credentials and format (`schoolNumber.username`) |
| `401` | stundenplan24.de rejected the credentials | Verify your school number, username, and password |
| `400` | Invalid `view` value | Use `day` or `week` |
| `400` | Multiple of `class`/`room`/`teacher` provided | Use only one filter at a time |
| `400` | Unparseable `date` | Use `D.M.YYYY` format, e.g. `16.6.2026` |
| `502` | Can't reach stundenplan24.de | Upstream outage; try again later |
| `500` | Internal server error | Check server logs |

All error bodies look like: `{ "error": "<message>" }`
