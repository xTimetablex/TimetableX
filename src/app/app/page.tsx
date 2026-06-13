import ClientViewer from '@/components/ClientViewer';
import { ViewMode } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{ date?: string; view?: string; step?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const { date, view, step } = await searchParams;
  const currentViewMode: ViewMode = view === 'week' ? 'week' : 'day';
  const currentStep = step === 'timetable' ? 'timetable' : 'selection';

  return (
    <main className="app-shell edge-shell">
      <ClientViewer
        currentDateStr={date}
        currentViewMode={currentViewMode}
        currentStep={currentStep}
      />
    </main>
  );
}
