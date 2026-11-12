import { ViewMode } from '@/lib/types';

const WIDTHS = [78, 60, 92, 50, 84, 68, 96, 55];

export function LessonListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <ol className="lesson-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => {
        const delay = `${(i % WIDTHS.length) * 0.07}s`;
        return (
          <li key={i} className="lesson">
            <span className="lesson-hour">
              <span className="skeleton" style={{ width: 20, height: 18, margin: '0 auto', animationDelay: delay }} />
            </span>
            <div className="lesson-main gap-1.5">
              <span className="skeleton" style={{ width: `${WIDTHS[i % WIDTHS.length] * 0.6}%`, maxWidth: 140, height: 16, animationDelay: delay }} />
              <span className="skeleton" style={{ width: 70, height: 12, animationDelay: delay }} />
            </div>
            <span className="lesson-room">
              <span className="skeleton skeleton-pill" style={{ width: 44, height: 22, animationDelay: delay }} />
            </span>
            <span className="lesson-info">
              <span className="skeleton" style={{ width: `${WIDTHS[(i + 3) % WIDTHS.length]}%`, maxWidth: 220, height: 12, animationDelay: delay }} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function WeekSkeleton() {
  return (
    <div className="week-scroller" aria-hidden="true">
      <div className="week-grid">
        {Array.from({ length: 5 }, (_, i) => (
          <section key={i} className="week-day panel-muted">
            <div className="week-day-header">
              <span className="skeleton" style={{ width: 90, height: 14, animationDelay: `${i * 0.07}s` }} />
              <span className="skeleton" style={{ width: 60, height: 12, marginTop: 8, animationDelay: `${i * 0.07}s` }} />
            </div>
            <LessonListSkeleton rows={4} />
          </section>
        ))}
      </div>
    </div>
  );
}

export function TimetableBodySkeleton({ viewMode }: { viewMode: ViewMode }) {
  return (
    <>
      <output className="sr-only">Daten werden geladen…</output>
      {viewMode === 'week' ? (
        <WeekSkeleton />
      ) : (
        <div className="day-container">
          <div className="day-surface">
            <LessonListSkeleton rows={7} />
          </div>
        </div>
      )}
    </>
  );
}

/** Header and plan placeholders, shown while the server is still loading the plan. */
export function AppSkeleton({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <div className="app-header" aria-hidden="true">
        <div className="app-header-inner">
          <div className="flex items-center gap-2">
            <span className="skeleton" style={{ flex: 1, maxWidth: 280, height: 48, borderRadius: 'var(--radius-lg)' }} />
            <span className="skeleton" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', marginLeft: 'auto' }} />
            <span className="skeleton" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)' }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="skeleton" style={{ width: 230, height: 22 }} />
            <span className="skeleton" style={{ width: 300, maxWidth: '100%', height: 48, borderRadius: 'var(--radius-md)' }} />
          </div>
        </div>
      </div>
      <TimetableBodySkeleton viewMode={viewMode} />
    </div>
  );
}
