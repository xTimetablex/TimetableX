import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import ClientViewer from '@/components/ClientViewer';
import { AppSkeleton } from '@/components/TimetableSkeleton';
import { getDefaultDateStr, getTodayStr, isValidDateStr } from '@/lib/date';
import { AUTH_COOKIE_NAME, getPublicIdentity, readAuthSession } from '@/lib/server/authSession';
import { fetchStundenplan } from '@/lib/stundenplan';
import { dayQueryKey, getViewDates } from '@/lib/timetableQuery';
import { Credentials, ViewMode } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Stundenplan – TimetableX',
  description: 'Dein Vertretungsplan auf einen Blick.',
};

/** Past this, the page is sent without the plan and the browser loads it itself. */
const PREFETCH_TIMEOUT_MS = 2500;

interface PageProps {
  searchParams: Promise<{ date?: string; view?: string }>;
}

export default async function AppPage({ searchParams }: PageProps) {
  const { date, view } = await searchParams;
  const viewMode: ViewMode = view === 'week' ? 'week' : 'day';
  const todayStr = getTodayStr();
  const defaultDateStr = getDefaultDateStr();
  const dateStr = isValidDateStr(date) ? date : defaultDateStr;

  // Reading the session here (instead of asking /api/auth from the browser)
  // means the first HTML already shows the app, not a blank page.
  const credentials = readAuthSession((await cookies()).get(AUTH_COOKIE_NAME)?.value);

  return (
    <main className="app-shell edge-shell">
      {credentials ? (
        <Suspense fallback={<AppSkeleton viewMode={viewMode} />}>
          <PrefetchedApp
            credentials={credentials}
            dateStr={dateStr}
            viewMode={viewMode}
            defaultDateStr={defaultDateStr}
            todayStr={todayStr}
          />
        </Suspense>
      ) : (
        <ClientViewer initialIdentity={null} defaultDateStr={defaultDateStr} todayStr={todayStr} />
      )}
    </main>
  );
}

/**
 * Loads the visible day(s) on the server and hands them to the client cache,
 * so the plan is in the first response instead of behind two more round trips.
 * The skeleton streams first (Suspense); if stundenplan24 is slow, the page is
 * sent without the data after PREFETCH_TIMEOUT_MS and the browser fetches it.
 * The server-side upstream fetch keeps running and fills the cache it hits.
 */
async function PrefetchedApp({
  credentials,
  dateStr,
  viewMode,
  defaultDateStr,
  todayStr,
}: {
  credentials: Credentials;
  dateStr: string;
  viewMode: ViewMode;
  defaultDateStr: string;
  todayStr: string;
}) {
  const identity = getPublicIdentity(credentials);
  const queryClient = new QueryClient();

  const prefetch = Promise.all(
    getViewDates(dateStr, viewMode).map(day =>
      queryClient.prefetchQuery({
        queryKey: dayQueryKey(identity, day),
        queryFn: () => fetchStundenplan(credentials.school, credentials.user, credentials.pass, day),
      })
    )
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    prefetch,
    new Promise(resolve => {
      timer = setTimeout(resolve, PREFETCH_TIMEOUT_MS);
    }),
  ]);
  clearTimeout(timer);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientViewer initialIdentity={identity} defaultDateStr={defaultDateStr} todayStr={todayStr} />
    </HydrationBoundary>
  );
}
