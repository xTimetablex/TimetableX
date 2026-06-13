# Landing Page

## Problem

TimetableX currently has no marketing/landing page — `/` renders the app
directly (the class/teacher/room selection screen via `ClientViewer`). New
visitors land straight in a functional UI with no introduction to what the
app does or why it's better than VPMobil24.

We want a clean, animated landing page at `/` that introduces TimetableX,
highlights its features, and gets users into the app via a clear CTA — built
strictly within the existing design system (Fraunces/Atkinson Hyperlegible
fonts, the blue/purple pastel palette, chunky 3D buttons, drifting-orb
`BackgroundField`), with bouncy, spring-based scroll animations via Framer
Motion.

## Routing

- `src/app/page.tsx` (current selection/timetable app, reads `date`/`view`/`step`
  search params and renders `ClientViewer`) moves to `src/app/app/page.tsx`,
  unchanged.
- `src/app/page.tsx` becomes the new landing page: a server component
  rendering the `'use client'` `LandingPage` component.
- `ClientViewer.tsx`: `pushDate` (line 35) and `pushStep` (line 58) update
  their `router.push('/?...')` calls to `router.push('/app?...')`.
- `LegalDocument.tsx`: the "back" link (`href="/"`, line 31) changes to
  `/app`, so users return to the app (not the landing page) from
  Impressum/Datenschutz.
- `BackgroundField` stays global in `layout.tsx` — the landing page inherits
  the drifting-orb background for free, no changes needed there.

## New dependency

- `framer-motion`

## New components

Flat in `src/components/`, following existing convention (no subdirectories):

- `LandingPage.tsx` — orchestrator, `'use client'`, composes the sections
  below
- `LandingHero.tsx`
- `LandingFeatures.tsx`
- `LandingShowcase.tsx`
- `LandingFooter.tsx`
- `src/lib/motionVariants.ts` — shared Framer Motion variants (spring
  stagger/pop-in) reused across Hero/Features/Showcase

## Sections

### Hero (`LandingHero`)

- Pill label: "Der bessere Vertretungsplan"
- `<h1>` "TimetableX" — large Fraunces display type
- Tagline: short German subtitle, e.g. "Dein Stundenplan. Klar, schnell,
  ohne Schnickschnack."
- CTA buttons:
  - `btn-primary` "Jetzt starten" → `Link href="/app"`
  - `btn-outline` "Mehr erfahren" → smooth-scrolls to the features section
    anchor (relies on existing `scroll-behavior: smooth`)
- A small tilted preview panel teaser below the buttons — a simplified
  version of the showcase illustration
- **Animation**: a `motion` container with `staggerChildren` reveals pill →
  h1 → tagline → buttons → preview panel in sequence on page load, using
  spring physics (`type: "spring"`, slight bounce/overshoot)

### Features (`LandingFeatures`)

- Heading: "Alles, was du brauchst"
- Grid of feature cards (`.panel` styling, `lucide-react` icons), each with
  title + short description. Six features:
  1. Wochenansicht — alle 5 Tage auf einen Blick
  2. Filter nach Klasse, Lehrer oder Raum
  3. Fächer-Blacklist — blende aus, was dich nicht interessiert
  4. Installierbar als App (PWA)
  5. Schnell & werbefrei
  6. Öffentliche API für Entwickler
- **Animation**: each card has its own `whileInView` spring pop-in
  (scale+rotate+translateY → settle), staggered by index,
  `viewport={{ once: true }}` for a one-time reveal as the user scrolls down

### Showcase (`LandingShowcase`)

- Heading + short copy: "So sieht's aus"
- A CSS-built device-frame illustration mirroring the real `TimetableTable`:
  rounded panel "browser chrome" containing a header row + ~4 mock entry rows
  (subject chip, room, teacher, time) styled with the actual design tokens
  (`.panel`, `.chip`, colors). Not a real screenshot — built from markup so
  it can be animated piece-by-piece and never goes stale.
- **Animation**: rows stagger-in with the same spring bounce as the feature
  cards when the section scrolls into view; the frame itself has a slight
  tilt for visual interest.

### Footer (`LandingFooter`)

- TimetableX branding + links to `/impressum` and `/datenschutz`
- Simple fade-in on scroll into view

## Animation principles

- All scroll/entrance animations use spring physics with overshoot (bouncy,
  matches the chunky 3D button "squish" feel) via shared variants in
  `src/lib/motionVariants.ts`.
- Respect `prefers-reduced-motion` via Framer Motion's `useReducedMotion()`
  hook — animations collapse to simple fades/no-motion, consistent with how
  `BackgroundField` and the global CSS already handle it.
- Button press/hover stays on existing `.btn`/`.icon-btn` CSS (offset-shadow
  squish) — Framer Motion is only for entrance/scroll reveals, not
  re-implementing button mechanics.

## Verification

- `bun run dev`:
  - `/` shows the new landing page
  - `/app` still runs the full selection → timetable flow, with working
    date/view navigation
  - CTA buttons navigate correctly (`/app`, smooth-scroll to features)
  - Scroll animations trigger with spring/bounce as sections enter the
    viewport
  - `prefers-reduced-motion: reduce` disables the entrance/scroll animations
- No new automated tests needed (purely visual/animation work); existing
  test suite (`bun run test`) and `tsc --noEmit` should still pass.
