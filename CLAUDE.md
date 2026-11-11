# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev         # Dev server (`next dev --webpack`); LAN access only from IPs in next.config.ts `allowedDevOrigins`
bun run build       # Production build (`output: 'standalone'`)
bun run start       # Start production server
bun run test        # Vitest, single run
bun run test:watch  # Vitest, watch mode
bun run lint        # Type check only (`tsc --noEmit`) — there is no ESLint
bun run doctor      # React Doctor scan (npx react-doctor@latest)
```

Run a single test file: `bun run test src/lib/__tests__/date.test.ts` (or `-t "<name>"` to filter by test name).

**Use `bun run test`, never `bun test`.** `bun test` starts Bun's built-in runner instead of Vitest. That runner ignores `vitest.config.ts` (no jsdom, no `vitest.setup.ts`) and has no `vi.stubGlobal`/`vi.unstubAllGlobals`, so the `trackingConsent`, `authMigration` and `weekFailure` tests fail even though the suite is green under Vitest.

### Package manager gotcha

Bun runs the scripts, but **`package-lock.json` is the only committed lockfile**. `bun.lock`/`bun.lockb` are gitignored, and `projectAudit.test.ts` fails if either is tracked. CI installs with `bun install --frozen-lockfile` (which reads `package-lock.json`) and the Dockerfile uses `npm ci`. So add or upgrade dependencies with `npm install <pkg>` to keep `package-lock.json` in sync. Node version is 20 (`.nvmrc`, Dockerfile).

## Stack

Next.js 16 (App Router), React 19.2, TypeScript, TanStack Query v5, Zod v4, Tailwind v4, framer-motion (landing page only), lucide-react, `xml2js`, `web-haptics`, `@sentry/nextjs` v11, `posthog-js` (lazy-loaded). The UI and all user-facing error messages are in German.

## Architecture

**TimetableX** fetches substitution timetables (Vertretungspläne) from `stundenplan24.de` (VPMobil24) and displays them for German schools.

### Routes

| Route | File | Purpose |
|---|---|---|
| `/` | `src/app/page.tsx` → `LandingPage` | Marketing landing page. Redirects to `/app` when the user is logged in or the PWA runs in standalone mode. |
| `/app` | `src/app/app/page.tsx` → `ClientViewer` | The actual timetable app. Reads `?date=YYYYMMDD`, `?view=day\|week`, `?step=selection\|timetable`. |
| `/datenschutz`, `/impressum` | `src/app/*/page.tsx` → `LegalDocument` | Legal pages |
| `GET/POST/DELETE /api/auth` | `src/app/api/auth/route.ts` | Read session identity / log in (set cookie) / log out |
| `POST /api/stundenplan` | `src/app/api/stundenplan/route.ts` | `{ date?, view? }` → `TimetableData` or `TimetableWeekData` |
| `POST /api/subjects` | `src/app/api/subjects/route.ts` | `{ filterMode, selectedValue }` → subjects seen for that entity over the last 8 weekdays (fetched in batches of 3), used by the blacklist modal |
| `GET /api/public/timetable` | `src/app/api/public/timetable/route.ts` | Public JSON API using HTTP Basic Auth. Documented in `docs/public-timetable-api.md` |

### Authentication

Credentials (`school`, `user`, `pass`) never live in the browser:

- `POST /api/auth` encrypts them with AES-256-GCM (`src/lib/server/authSession.ts`) into the httpOnly cookie `timetablex_session` (30 days). The key comes from the `TIMETABLEX_AUTH_SECRET` env var (falls back to `AUTH_SECRET` / `NEXTAUTH_SECRET`, then an insecure dev default). Login does **not** validate the credentials against stundenplan24; a bad password only surfaces on the first data fetch.
- Cookie-authenticated API routes call `getAuthCredentials(request)` and return 401 if it is `null`. The client sends only `{ date, view }` etc., never credentials.
- The client only ever sees `AuthIdentity` (`{ school, user }`), via `useAuth`.
- `src/lib/authMigration.ts` exchanges old `localStorage['school_creds']` entries (from before cookie sessions existed) for a session cookie once, then deletes them.
- The public API instead parses `Authorization: Basic base64("SCHULNUMMER.BENUTZER:PASS")` (`src/lib/server/publicAuth.ts`). The school number is split off at the first dot.

`projectAudit.test.ts` enforces this. It fails if `useAuth.ts` touches `localStorage` or `school_creds`, or if `useTimetable`/`useAvailableSubjects` send `pass` or `...creds` in a request body.

### Data fetching (`src/lib/stundenplan.ts`)

- Fetches `https://www.stundenplan24.de/{school}/wplan/wdatenk/WPlanKl_{YYYYMMDD}.xml` with Basic Auth and `cache: 'no-store'`, then parses it with `xml2js`. Change flags (`roomChanged`, `teacherChanged`, …) come from the XML `*Ae` attributes. `dayNotes` come from `ZusatzInfo` and `FreieTexte`.
- HTTP 401 → throws `'Ungültiger Benutzername oder Passwort.'`. Any other non-OK status (no plan published) → returns an **empty day** with `isWeekend` set from the date. Network failure → throws `'Verbindung zum Server fehlgeschlagen.'`
- `fetchWeekStundenplan` fetches Mon–Fri in parallel with `Promise.allSettled`. **Any** failed day fails the whole week, with the auth error taking priority (covered by `weekFailure.test.ts`). It merges `available{Classes,Rooms,Teachers}` across the days.
- **Gotcha:** API routes choose HTTP status codes by substring-matching these German messages (`'Ungültig'` → 401, `'Verbindung'` → 502). Changing the wording breaks the status mapping.

### Client state (`/app`)

`ClientViewer` (`src/components/ClientViewer.tsx`) orchestrates everything. It is a two-step flow (`step=selection` → `SelectionMenu`, `step=timetable` → `TimetableTable` or `WeekTimetableView`), and all navigation goes through `router.push('/app?...')`. Day navigation skips weekends; week navigation jumps ±7 days. Cmd/Ctrl+K opens `CommandPalette`.

| Hook | Responsibility | Persistence |
|---|---|---|
| `useAuth` | Session identity, login/logout via `/api/auth`, legacy migration | httpOnly cookie |
| `useTimetable` | TanStack Query fetch of `/api/stundenplan`; filter mode/value; computes `filteredEntries` (day) / `filteredDays` (week); auto-selects the first available value unless the day has no options (weekend/holiday keeps the selection) | `localStorage` `filterMode`, `filterValue` |
| `useBlacklist` | Per-entity hidden subjects | `localStorage` `timetable_blacklist` = `Record<entity, subject[]>` |
| `useFavorites` | Up to 4 `{ mode, value }` favorites | `localStorage` `favorites` |
| `useExtendedEntities` | Fetches the previous 2 weeks so the command palette can find classes/rooms/teachers that don't appear on the current plan | `localStorage` `extended_entities_{school}` (24h TTL) |
| `useAvailableSubjects` | `/api/subjects` for the blacklist modal | Query cache (30 min) |

`filterEntries` (`src/lib/filterEntries.ts`) is a pure, server-safe function shared by `useTimetable` and the public API. Keep it out of `'use client'` modules. `useTimetable.ts` re-exports it, and also exports `computeIsSelectionAvailable` for tests.

`src/app/providers.tsx` sets up the `QueryClient` (5 min `staleTime`, no refetch on focus), `HapticsProvider` (vibration on pointerdown via `web-haptics`), the cookie consent banner, and starts PostHog once consent is `accepted`.

### Demo mode

`school: 'sample'` or `'demo'` skips the remote fetch and returns `SAMPLE_DATA` from `stundenplan.ts` (week view repeats it for all 5 days). Because login doesn't validate credentials, you can log into the local app with school `demo` and any username/password.

### Analytics

PostHog Cloud **EU** (project ID 143991), consent-gated via the cookie `timetablex_tracking_consent` (`src/lib/trackingConsent.ts`, `CookieConsentBanner`).

- `src/lib/analytics.ts`: `initAnalytics()` **dynamically imports** `posthog-js` and calls `init`. `providers.tsx` calls it only when consent is `accepted`. Until then no PostHog code is downloaded and nothing is stored on the device. `projectAudit.test.ts` fails on a static `posthog-js` import.
- `track(event, props)` is the only way to send custom events. It drops events until PostHog has loaded.
- Traffic goes through a **same-origin reverse proxy** at `/ttx` (`POSTHOG_PROXY_PATH`, rewrites in `next.config.ts` → `eu-assets.i.posthog.com` / `eu.i.posthog.com`, plus `skipTrailingSlashRedirect`). Don't rename it to something generic like `/analytics` or `/posthog`, which blockers match. Earlier attempts used custom subdomains (`z.`, `umami.timetablex.space`) that never had DNS, so nothing was collected from June to November 2026.
- Config: anonymous events (`person_profiles: 'identified_only'`, we never `identify`), no session recording (Sentry does masked replays), no surveys, `defaults` pinned to a date.
- The key comes only from `NEXT_PUBLIC_POSTHOG_KEY` (a build arg in `deploy.yml`). Without it nothing loads, so local dev sends nothing unless you set it in `.env.local`.
- Changing what's collected is a privacy change: update `src/app/datenschutz/page.tsx` §5.

### Error monitoring (Sentry)

Sentry project `vectrum-vs/timetablex`, EU region (`de.sentry.io`). It reports errors, 10% of traces in production (100% in dev), and Session Replay only for sessions that hit an error.

| File | Role |
|---|---|
| `src/lib/sentryOptions.ts` | DSN, environment, sample rates and `dataCollection`, shared by browser and server |
| `src/instrumentation-client.ts` | Browser SDK + Replay. Runs for every visitor **without consent** (legitimate interest), so it must not write to the device: hence `stickySession: false` |
| `src/instrumentation.ts`, `src/sentry.server.config.ts` | Node SDK (no edge runtime is used). `onRequestError` reports uncaught route/render errors. `tracePropagationTargets: []` keeps trace headers off requests to stundenplan24 |
| `src/app/global-error.tsx` | Root error boundary (German fallback UI) |
| `src/app/sentry-tunnel/route.ts` + `tunnelRoute` in `next.config.ts` | Browser events go through our server ("handler mode"), so Sentry never sees user IPs and ad blockers don't drop events |

- **Credential gotcha:** Sentry's built-in scrubbing matches `password`/`pwd` but **not `pass`**, the key this app uses everywhere. `dataCollection` therefore switches off request bodies, cookies, the `cookie`/`x-forwarded-for` headers, user info/IPs and stack-frame local variables. Don't loosen these, and never `Sentry.setUser()`/`setContext()` with credentials. Any change to them is a privacy change that `src/app/datenschutz/page.tsx` §6 must reflect.
- Route handlers that catch errors call `Sentry.captureException` themselves (except `'Ungültig'` auth errors, which are user mistakes). Errors that escape a handler are reported by `onRequestError`.
- The DSN comes only from `NEXT_PUBLIC_SENTRY_DSN`. Without it the SDK does nothing, so local dev doesn't report unless you set it in `.env.local`. Test events show up with `environment: development`.
- Expect Sentry's Dedupe integration to drop an error identical to the one just before it (same root-cause stack), e.g. repeated stundenplan24 connection failures from different routes.

### PWA

The manifest is `src/app/manifest.ts` (`start_url: '/app'`). There is **no service worker**: `layout.tsx` actively unregisters any previously installed one, and `projectAudit.test.ts` fails if `register('/sw.js')` reappears. Don't re-add offline caching without removing that guard on purpose.

### Styling

Tailwind v4 plus a design token system in `src/app/globals.css`. All colors, radii, shadows and transitions are CSS variables on `:root` (`--color-primary`, `--color-surface`, …), exposed to Tailwind via `@theme inline`. Dark mode overrides live under `@media (prefers-color-scheme: dark)`. Fonts are Atkinson Hyperlegible (body) and Fraunces (display). Prefer the variables over hardcoded values. The landing page uses framer-motion through `LazyMotion` + `MotionConfig reducedMotion="user"`, with shared variants in `src/lib/motionVariants.ts` and fake data in `src/lib/mockTimetableData.ts`.

## Tests

Tests live in `src/lib/__tests__/` and run under Vitest (`vitest.config.ts`: `node` environment, tsconfig path aliases, `vitest.setup.ts`). Files that need a DOM opt in with `// @vitest-environment jsdom` (`trackingConsent`, `authMigration`). `vitest.setup.ts` polyfills `localStorage`/`sessionStorage` for jsdom, because Node 26+ defines a broken global that stops jsdom from installing its own.

- Pure units: `date`, `filterEntries`, `isSelectionAvailable`, `authSession`, `publicAuth`, `trackingConsent`, `authMigration` (mocks `fetch`)
- Route/integration: `publicTimetableRoute` (calls the route handler directly using demo credentials), `weekFailure` (mocks `fetch` to check week-level error propagation)
- `projectAudit`: static checks on the repo itself (npm-only lockfile, Next version pin, postcss override, `allowedDevOrigins`, no plaintext credentials client-side, no service worker). If you intentionally change one of these, update the test in the same change.

## CI & deployment

- `.github/workflows/test.yml`: `bun run test` on every push and PR.
- `.github/workflows/react-doctor.yml`: advisory React Doctor scan on PRs and pushes to `main`. It never blocks.
- `.github/workflows/deploy.yml`: triggered by **publishing a GitHub Release** (tags like `1.2.3`, no `v`). It runs tests, then React Doctor (non-blocking), then builds the Docker image and pushes it to `ghcr.io/xtimetablex/timetablex` (tags `latest` and the release tag). Finally it POSTs to an **Openship incoming deploy webhook** (`OPENSHIP_DEPLOY_HOOK_URL`/`_TOKEN` secrets).
- Production runs on **Openship** (self-hosted PaaS, dashboard `dash.timetablex.space`, project `TimetableX`). The project uses a *release image* source: it deploys `ghcr.io/xtimetablex/timetablex:{tag}` for the latest GitHub Release and never builds from git. Openship doesn't redeploy on new releases by itself, which is why the webhook exists. There is no Watchtower or Caddy.
- `NEXT_PUBLIC_*` vars are inlined at **build time** (Docker build args in `deploy.yml`, including `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_RELEASE` = the release tag). Runtime secrets such as `TIMETABLEX_AUTH_SECRET` are project env vars in Openship. See `DEPLOY.md`.
- Source maps are uploaded to Sentry during `next build` only when `SENTRY_AUTH_TOKEN` is set. In CI it comes from the GitHub secret of the same name, passed as a BuildKit secret (`RUN --mount=type=secret` in the Dockerfile) so it never ends up in an image layer. Without the token the build still succeeds; stack traces just stay minified. The secret mount needs BuildKit, so Openship's legacy-builder git builds can't build this Dockerfile.

## Design docs

Feature specs and implementation plans are in `docs/superpowers/{specs,plans}/`, named `YYYY-MM-DD-<feature>`. `2026-07-12-push-notifications-and-ical-export-design.md` is a **design only, not implemented yet**: there is no database, push or iCal code.
