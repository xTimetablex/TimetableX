# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clean, animated landing page at `/` for TimetableX that matches the existing design system exactly, with bouncy spring-based scroll animations, and move the current app (selection/timetable flow) to `/app`.

**Architecture:** New `Landing*` presentational components live in `src/components/`, built from existing design tokens (`globals.css` variables, `.panel`/`.btn`/`.badge` classes, Fraunces/Atkinson Hyperlegible fonts). They share a small set of Framer Motion spring variants (`src/lib/motionVariants.ts`) and a shared mock-timetable illustration (`src/components/LandingTimetablePreview.tsx`). `LandingPage.tsx` composes everything inside a single `MotionConfig reducedMotion="user"` wrapper, which is the one mechanism that disables all entrance/scroll animations when the OS-level reduced-motion preference is set. The existing app moves unchanged from `src/app/page.tsx` to `src/app/app/page.tsx`, and the two places that build internal links (`ClientViewer.tsx`'s `pushDate`/`pushStep`, `LegalDocument.tsx`'s back link) are updated to point at `/app`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Framer Motion 12, `lucide-react` icons, existing CSS custom properties from `src/app/globals.css`.

---

### Task 1: Install Framer Motion

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (or `bun.lock`, see Step 1 note)

- [ ] **Step 1: Install the dependency**

Run: `bun add framer-motion`

Expected: `framer-motion` (currently `^12.x`) appears under `"dependencies"` in `package.json`. Bun will update `package-lock.json` in place — if it instead creates a new `bun.lock` file, that's fine too, just note it for the commit step.

- [ ] **Step 2: Type-check**

Run: `bun run lint`

Expected: passes with no errors (no source changes yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
# If `bun add` created bun.lock instead of updating package-lock.json:
#   git add bun.lock
git commit -m "Add framer-motion dependency"
```

---

### Task 2: Shared motion variants

**Files:**
- Create: `src/lib/motionVariants.ts`

- [ ] **Step 1: Create the variants file**

```typescript
import type { Variants } from 'framer-motion';

export const springPop: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.85, rotate: -4 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 260, damping: 18 },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};
```

- [ ] **Step 2: Type-check**

Run: `bun run lint`

Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/motionVariants.ts
git commit -m "Add shared spring motion variants for landing page"
```

---

### Task 3: Shared mock timetable illustration

This builds the small "device frame" mock UI reused by both the hero teaser
and the showcase section — a header row plus a handful of fake timetable
entries styled with the real `.panel`/`.badge` classes and color tokens.

**Files:**
- Create: `src/components/LandingTimetablePreview.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { CheckCircle2 } from 'lucide-react';

export interface MockTimetableEntry {
  hour: string;
  subject: string;
  teacher: string;
  room: string;
}

export const MOCK_TIMETABLE_ENTRIES: MockTimetableEntry[] = [
  { hour: '1', subject: 'Mathematik', teacher: 'Hr. Müller', room: 'A12' },
  { hour: '2', subject: 'Englisch', teacher: 'Fr. Schmidt', room: 'B04' },
  { hour: '3', subject: 'Sport', teacher: 'Hr. Bauer', room: 'Halle 2' },
  { hour: '4', subject: 'Chemie', teacher: 'Fr. Weber', room: 'C21' },
];

export function LandingTimetableHeader() {
  return (
    <div
      className="flex items-center gap-2 px-4 py-3"
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
    >
      <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        Montag, 15.06.
      </span>
    </div>
  );
}

export function LandingTimetableRow({
  entry,
  isLast,
}: {
  entry: MockTimetableEntry;
  isLast: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}
    >
      <span className="w-6 text-center text-sm font-bold" style={{ color: 'var(--color-text)' }}>
        {entry.hour}
      </span>
      <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {entry.subject}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {entry.teacher}
      </span>
      <span className="badge">{entry.room}</span>
    </div>
  );
}

export default function LandingTimetablePreview({ rowCount = 2 }: { rowCount?: number }) {
  const rows = MOCK_TIMETABLE_ENTRIES.slice(0, rowCount);
  return (
    <div className="panel overflow-hidden">
      <LandingTimetableHeader />
      <div>
        {rows.map((entry, i) => (
          <LandingTimetableRow key={entry.hour} entry={entry} isLast={i === rows.length - 1} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bun run lint`

Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingTimetablePreview.tsx
git commit -m "Add shared mock timetable illustration for landing page"
```

---

### Task 4: Hero section

**Files:**
- Create: `src/components/LandingHero.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { springPop, staggerContainer } from '@/lib/motionVariants';
import LandingTimetablePreview from './LandingTimetablePreview';

export default function LandingHero() {
  return (
    <section className="flex flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 lg:px-8">
      <motion.div
        className="flex w-full max-w-2xl flex-col items-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.span
          variants={springPop}
          className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold"
          style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          Der bessere Vertretungsplan
        </motion.span>

        <motion.h1
          variants={springPop}
          className="mt-4 text-4xl font-bold sm:text-6xl"
          style={{ color: 'var(--color-text)' }}
        >
          TimetableX
        </motion.h1>

        <motion.p
          variants={springPop}
          className="mt-4 max-w-md text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Dein Stundenplan. Klar, schnell, ohne Schnickschnack.
        </motion.p>

        <motion.div
          variants={springPop}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/app" className="btn btn-primary px-6 py-3 text-base">
            Jetzt starten
          </Link>
          <a href="#features" className="btn btn-outline px-6 py-3 text-base">
            Mehr erfahren
          </a>
        </motion.div>

        <motion.div
          variants={springPop}
          className="mt-12 w-full max-w-sm"
          style={{ transform: 'rotate(-2deg)' }}
        >
          <LandingTimetablePreview rowCount={2} />
        </motion.div>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bun run lint`

Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingHero.tsx
git commit -m "Add landing page hero section"
```

---

### Task 5: Feature highlights section

**Files:**
- Create: `src/components/LandingFeatures.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { motion } from 'framer-motion';
import { Calendar, Filter, EyeOff, Smartphone, Zap, Code2 } from 'lucide-react';

import { springPop, staggerContainer } from '@/lib/motionVariants';

const FEATURES = [
  {
    icon: Calendar,
    title: 'Wochenansicht',
    description: 'Alle 5 Tage auf einen Blick.',
  },
  {
    icon: Filter,
    title: 'Flexible Filter',
    description: 'Nach Klasse, Lehrer oder Raum.',
  },
  {
    icon: EyeOff,
    title: 'Fächer-Blacklist',
    description: 'Blende aus, was dich nicht interessiert.',
  },
  {
    icon: Smartphone,
    title: 'Installierbar',
    description: 'Als App auf dem Homescreen (PWA).',
  },
  {
    icon: Zap,
    title: 'Schnell & werbefrei',
    description: 'Keine Tracker, keine Werbung, kein Ballast.',
  },
  {
    icon: Code2,
    title: 'Öffentliche API',
    description: 'Für Entwickler, die eigene Tools bauen wollen.',
  },
] as const;

export default function LandingFeatures() {
  return (
    <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <h2
          className="text-center text-3xl font-bold sm:text-4xl"
          style={{ color: 'var(--color-text)' }}
        >
          Alles, was du brauchst
        </h2>
        <motion.div
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <motion.div key={title} variants={springPop} className="panel p-5">
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
                style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                {title}
              </h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bun run lint`

Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingFeatures.tsx
git commit -m "Add landing page feature highlights section"
```

---

### Task 6: Showcase section

**Files:**
- Create: `src/components/LandingShowcase.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { motion } from 'framer-motion';

import { springPop, staggerContainer } from '@/lib/motionVariants';
import {
  MOCK_TIMETABLE_ENTRIES,
  LandingTimetableHeader,
  LandingTimetableRow,
} from './LandingTimetablePreview';

export default function LandingShowcase() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <h2 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--color-text)' }}>
          So sieht&apos;s aus
        </h2>
        <p className="mt-3 max-w-md text-base" style={{ color: 'var(--color-text-secondary)' }}>
          Übersichtlich, schnell und genau das, was du brauchst — ohne Schnickschnack.
        </p>

        <motion.div
          className="panel mt-10 w-full max-w-md overflow-hidden"
          style={{ transform: 'rotate(1.5deg)' }}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <LandingTimetableHeader />
          <div>
            {MOCK_TIMETABLE_ENTRIES.map((entry, i) => (
              <motion.div key={entry.hour} variants={springPop}>
                <LandingTimetableRow
                  entry={entry}
                  isLast={i === MOCK_TIMETABLE_ENTRIES.length - 1}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bun run lint`

Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingShowcase.tsx
git commit -m "Add landing page showcase section"
```

---

### Task 7: Footer

**Files:**
- Create: `src/components/LandingFooter.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingFooter() {
  return (
    <motion.footer
      className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm sm:flex-row sm:px-6 lg:px-8"
      style={{ color: 'var(--color-text-muted)' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <p>TimetableX</p>
      <nav className="flex items-center gap-4">
        <Link href="/datenschutz" className="transition-colors hover:text-[var(--color-text)]">
          Datenschutz
        </Link>
        <Link href="/impressum" className="transition-colors hover:text-[var(--color-text)]">
          Impressum
        </Link>
      </nav>
    </motion.footer>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bun run lint`

Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingFooter.tsx
git commit -m "Add landing page footer"
```

---

### Task 8: LandingPage orchestrator

**Files:**
- Create: `src/components/LandingPage.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { MotionConfig } from 'framer-motion';

import LandingHero from './LandingHero';
import LandingFeatures from './LandingFeatures';
import LandingShowcase from './LandingShowcase';
import LandingFooter from './LandingFooter';

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-[100dvh] w-full flex-col">
        <LandingHero />
        <LandingFeatures />
        <LandingShowcase />
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
```

`reducedMotion="user"` is the single mechanism that satisfies the
prefers-reduced-motion requirement: when the OS-level setting is on, Framer
Motion disables all entrance/spring/whileInView transitions for every
`motion.*` element nested inside this `MotionConfig`, so content simply
appears without animation — consistent with how `BackgroundField` already
disables its pointer-tracking effect.

- [ ] **Step 2: Type-check**

Run: `bun run lint`

Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "Add landing page orchestrator component"
```

---

### Task 9: Routing — move the app to /app, wire the landing page at /

**Files:**
- Move: `src/app/page.tsx` → `src/app/app/page.tsx`
- Create: `src/app/page.tsx` (new landing root)
- Modify: `src/components/ClientViewer.tsx:35`
- Modify: `src/components/ClientViewer.tsx:58`
- Modify: `src/components/LegalDocument.tsx:31`

- [ ] **Step 1: Move the existing app page to /app**

```bash
git mv src/app/page.tsx src/app/app/page.tsx
```

This file's content (the `Home` component reading `date`/`view`/`step` search
params and rendering `ClientViewer`) is unchanged — only its location moves.

- [ ] **Step 2: Create the new landing root page**

Create `src/app/page.tsx`:

```tsx
import LandingPage from '@/components/LandingPage';

export default function Home() {
  return (
    <main className="app-shell edge-shell">
      <LandingPage />
    </main>
  );
}
```

- [ ] **Step 3: Update ClientViewer's internal navigation to /app**

In `src/components/ClientViewer.tsx`, update `pushDate` (currently line 35):

```typescript
function pushDate(router: ReturnType<typeof useRouter>, dateStr: string, viewMode: ViewMode) {
  router.push(`/app?date=${dateStr}&view=${viewMode}&step=timetable`);
}
```

And update `pushStep` (currently line 58):

```typescript
function pushStep(router: ReturnType<typeof useRouter>, step: 'selection' | 'timetable', dateStr?: string, viewMode?: ViewMode) {
  const params = new URLSearchParams();
  if (dateStr) params.set('date', dateStr);
  if (viewMode) params.set('view', viewMode);
  if (step === 'timetable') params.set('step', 'timetable');
  router.push(`/app?${params.toString()}`);
}
```

(Only the `/?` → `/app?` change in each `router.push` call — the rest of
both functions stays the same.)

- [ ] **Step 4: Update LegalDocument's back link to /app**

In `src/components/LegalDocument.tsx`, change the `Link` at line 31 from:

```tsx
            <Link
              href="/"
              className="btn btn-outline shrink-0 rounded-full px-4 py-2 text-sm"
            >
              Zur Startseite
            </Link>
```

to:

```tsx
            <Link
              href="/app"
              className="btn btn-outline shrink-0 rounded-full px-4 py-2 text-sm"
            >
              Zur Startseite
            </Link>
```

- [ ] **Step 5: Type-check**

Run: `bun run lint`

Expected: passes with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/app/page.tsx src/components/ClientViewer.tsx src/components/LegalDocument.tsx
git commit -m "Move app to /app and add landing page at /"
```

---

### Task 10: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Type-check**

Run: `bun run lint`

Expected: passes with no errors.

- [ ] **Step 2: Run the test suite**

Run: `bun run test`

Expected: all existing tests pass (no test changes were made in this plan).

- [ ] **Step 3: Production build**

Run: `bun run build`

Expected: build succeeds — this catches any SSR/hydration issues with the new
`'use client'` Framer Motion components.

- [ ] **Step 4: Manual browser check**

Run: `bun run dev`, then in a browser:

- Open `/` — the landing page loads: pill label → "TimetableX" → tagline →
  buttons → mock timetable preview pop in with a bouncy spring animation on
  page load.
- Click "Mehr erfahren" — smooth-scrolls down to the "Alles, was du brauchst"
  features section; the six feature cards spring/pop in as they enter the
  viewport.
- Continue scrolling — the "So sieht's aus" showcase panel's rows pop in one
  by one, then the footer fades in.
- Click "Jetzt starten" — navigates to `/app` and shows the existing
  selection screen.
- From `/app`, pick a class/teacher/room and continue — the timetable loads
  and date/week navigation (`pushDate`/`pushStep`) keeps you on `/app?...`
  URLs.
- From `/app`, open Datenschutz or Impressum and click "Zur Startseite" —
  returns to `/app`, not the landing page.
- In your browser devtools, enable "prefers-reduced-motion: reduce" (or set
  it at the OS level), reload `/` — all sections appear immediately without
  the spring/pop animations.

- [ ] **Step 5: Fix any issues found**

If Step 4 surfaces problems, fix them in the relevant component file(s) from
Tasks 4–9, re-run Steps 1–4, then commit the fix:

```bash
git add <fixed files>
git commit -m "Fix landing page issue found during verification"
```

If everything passes, no commit is needed for this task.
