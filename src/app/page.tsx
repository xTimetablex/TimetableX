import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/LandingPage';
import { AUTH_COOKIE_NAME, readAuthSession } from '@/lib/server/authSession';

export const metadata: Metadata = {
  title: 'TimetableX – Der bessere Vertretungsplan',
  description: 'Übersichtlich, schnell und genau das, was du brauchst — ohne Schnickschnack.',
};

export default async function Home() {
  // Logged-in users go straight to the app, without the landing page flashing first.
  if (readAuthSession((await cookies()).get(AUTH_COOKIE_NAME)?.value)) {
    redirect('/app');
  }

  return (
    <main className="app-shell edge-shell">
      <LandingPage />
    </main>
  );
}
