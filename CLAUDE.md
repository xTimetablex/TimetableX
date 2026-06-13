# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev      # Start dev server (webpack mode, allows LAN access via 192.168.x.x)
bun run build    # Production build
bun run start    # Start production server
bun run test     # Run Vitest tests
```

TypeScript type checking is available via `tsc --noEmit`.

## Tests

Tests live in `src/lib/__tests__/` and run with Vitest (config: `vitest.config.ts`, environment: `node` by default).

- **`trackingConsent.test.ts`** — Uses jsdom (`@vitest-environment jsdom`). Tests `readTrackingConsent` and `writeTrackingConsent` from `src/lib/trackingConsent.ts` via real browser cookies: no cookie → `'pending'`; valid values round-trip; unrecognised values fall back to `'pending'`; writing overwrites the previous value.

- **`date.test.ts`** — Tests six pure date utilities from `src/lib/date.ts`: `formatDateStr` (Date → `YYYYMMDD`, zero-padded), `parseDateStr` (inverse, round-trips), `addDays` (positive/negative, crosses month boundaries, non-mutating), `getWeekStart` (returns the preceding Monday), `getWeekDates` (5 consecutive Mon–Fri dates), `formatWeekLabel` (German "Woche vom D.M - D.M", including cross-month).

- **`filterEntries.test.ts`** — Tests the exported `filterEntries` function from `src/lib/filterEntries.ts` (re-exported from `src/lib/hooks/useTimetable.ts` for backwards compatibility): filtering by `class`, `teacher`, or `room`; empty filter value returns `[]`; results sorted by hour ascending; blacklist excludes one or multiple subjects.

## Architecture

**TimetableX** is a Next.js 15 (App Router) web app that fetches substitution timetables from `stundenplan24.de` and displays them for German schools.

### Data flow

1. `src/app/page.tsx` reads URL search params (`?date=`, `?view=`, `?step=`) and passes them to `ClientViewer`.
2. `ClientViewer` (`src/components/ClientViewer.tsx`) is the root client component orchestrating all state. It uses three main hooks:
   - `useAuth` — stores credentials in `localStorage` under key `school_creds`
   - `useTimetable` — fetches data via `POST /api/stundenplan`, manages filter state (mode + selected value), applies blacklist filtering
   - `useAvailableSubjects` — fetches available subjects for the blacklist modal
3. `POST /api/stundenplan` (`src/app/api/stundenplan/route.ts`) validates with Zod then calls `fetchStundenplan` or `fetchWeekStundenplan` from `src/lib/stundenplan.ts`.
4. `stundenplan.ts` fetches XML from `https://www.stundenplan24.de/{school}/wplan/wdatenk/WPlanKl_{dateStr}.xml` with HTTP Basic Auth, parses it with `xml2js`, and returns typed `TimetableData` / `TimetableWeekData`. For week view it fires 5 parallel day fetches with `Promise.allSettled`.

### View modes

- **Day view**: `TimetableTable` renders a flat list of filtered `TimetableEntry[]`
- **Week view**: `WeekTimetableView` renders `filteredDays[]` (each day has its own `filteredEntries`)
- View mode and date live in the URL; navigation calls `router.push` to update them.

### Filtering and blacklist

- Filter mode (`class` | `room` | `teacher`) and selected value are persisted in `localStorage`.
- Blacklist is per-entity, stored in `localStorage` under `timetable_blacklist` as `Record<entityName, subjectName[]>`. Blacklisted subjects are excluded from `filteredEntries`.

### Styling

CSS uses Tailwind v4 plus a comprehensive custom design token system defined in `globals.css` (`:root` block). All colors, radii, shadows, and transitions are CSS variables (`--color-primary`, `--color-surface`, etc.) with full dark mode overrides via `@media (prefers-color-scheme: dark)`. Prefer these variables over hardcoded values.

### PWA

A service worker (`public/sw.js`) is registered from `layout.tsx`. The app has PWA metadata for iOS home screen installation.

### Demo mode

Passing `school: 'sample'` or `school: 'demo'` to the API skips the remote fetch and returns `SAMPLE_DATA` from `stundenplan.ts` — useful for local development without real school credentials.

### Analytics

Self-hosted Umami is integrated via `src/app/providers.tsx` (loaded only after consent, via `NEXT_PUBLIC_UMAMI_SRC` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID`). Tracking is gated on `src/lib/trackingConsent.ts`; the consent banner lives in `src/components/CookieConsentBanner.tsx`. Custom events are sent via `track()` in `src/lib/analytics.ts`, which calls `window.umami.track`.
