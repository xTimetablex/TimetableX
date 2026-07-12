# Push notifications + iCal export

## Goal

Two features for favorited classes:

1. Push notifications when a favorited class has a lesson cancelled or moved to a different room.
2. A subscribable `.ics` calendar feed of a favorited class's timetable, so it stays current in Google/Apple Calendar.

Both require a small amount of server-side persistence, which the app currently has none of (auth is a stateless encrypted cookie; favorites live in `localStorage`).

## Storage: SQLite

One file (`better-sqlite3`) on a Docker volume. Single table `subscribers`:

| column | purpose |
|---|---|
| `id` (uuid, PK) | opaque id, stored in client `localStorage` |
| `endpoint`, `p256dh`, `auth` | Web Push subscription (nullable — a row can exist for iCal only) |
| `creds_enc` | school/user/pass, encrypted with the existing `authSession` AES-GCM helper (`src/lib/server/authSession.ts`), reused rather than reimplemented |
| `favorites` | JSON `[{mode,value}]` — only `class`-mode entries are used by both features |
| `ics_token` | random secret; the calendar feed's only auth mechanism |
| `seen` | JSON map of already-notified keys (`date|class|hour|type`), used for de-duplication |
| `updated_at` | for pruning stale rows |

The client never re-sends credentials to enable a feature: the subscribe route reads them from the existing httpOnly session cookie and stores an encrypted copy.

## Shared cancellation logic

`isCancelledEntry` currently lives inline in `src/components/TimetableTable.tsx`. Move it to `src/lib/timetableEntry.ts` so both the notification worker and the table use one implementation. Room-change detection reuses the existing `roomChanged` flag on `TimetableEntry`.

## Push notifications

- **Service worker**: `layout.tsx` currently *unregisters* any service worker. Replace this with real registration of a new `public/sw.js` that handles `push` (→ `showNotification`) and `notificationclick` (→ focus/open the relevant class view).
- **Opt-in UI**: a notification toggle near the existing favorites UI. Enabling it calls `Notification.requestPermission()`, then `pushManager.subscribe(VAPID_PUBLIC_KEY)`, then `POST /api/notifications/subscribe` with the subscription and current favorites.
- **Diff worker**: a separate long-running process (`worker/notify.ts`), scheduled with `node-cron`, running every ~15 minutes, Mon–Fri during school hours only (~06:00–17:00 local). For each subscriber's class favorites, fetches today + tomorrow via the existing `fetchStundenplan`, and for any cancelled or room-changed entry not already in `seen`, sends a Web Push notification (`web-push` npm package + VAPID keys) and records the key in `seen`. A `410 Gone` push response deletes the subscription fields from that row.
- **Env vars**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (new), reuses `TIMETABLEX_AUTH_SECRET`.

## iCal export

- `GET /api/calendar/[token].ics`: looks up the subscriber row by `ics_token`, fetches the current week via the existing `fetchWeekStundenplan` using the stored credentials, and emits one `VEVENT` per lesson for the subscriber's favorited classes. Cancelled lessons get `STATUS:CANCELLED` and a `❌` prefix in `SUMMARY`; room appears in `LOCATION`.
- UI: the same notifications panel shows the feed URL with a copy button and "Add to Google/Apple Calendar" links.
- **Bell-time calibration**: lesson start/end times are parsed from the source XML when present. Where the school's plan doesn't carry explicit times, fall back to a per-school configurable bell schedule (sensible German default), since school bell schedules vary and a single hardcoded table would silently be wrong for other schools.
  <!-- ponytail: fallback bell schedule is a fixed default table, upgrade to per-school config UI if a second school needs a different schedule -->

## Docker / deployment

- Add a `sqlite` volume mount to `docker-compose.yml` for the `web` service.
- Add a `worker` service to `docker-compose.yml`: same image (`ghcr.io/xtimetablex/timetablex:latest`), overridden `command` to run the notify worker instead of `node server.js`. No separate Dockerfile/build needed — the standalone Next.js output and `src/lib` are already in the image.
- Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` to `.env`.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` exposed to the client build for `pushManager.subscribe`.

## Explicitly out of scope (YAGNI)

- No user accounts/login system — the session cookie + opaque `id` is the identity.
- No UI for managing multiple `.ics` feeds — one feed per subscriber, covering all their class favorites.
- No retry/queue infrastructure for push delivery — failed sends are simply retried on the next 15-minute cycle; `410` responses prune the subscription.

## Known trade-off

This design stores each subscriber's school password server-side, encrypted but reversible (the worker must decrypt it to re-fetch the plan on their behalf). This is inherent to any "notify while the app is closed" design against a credential-gated upstream API, not an oversight.
