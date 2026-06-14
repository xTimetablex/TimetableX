import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: 'TimetableX – Der bessere Vertretungsplan',
  description: 'Übersichtlich, schnell und genau das, was du brauchst — ohne Schnickschnack.',
};

export default function Home() {
  return (
    <main className="app-shell edge-shell">
      <LandingPage />
    </main>
  );
}
