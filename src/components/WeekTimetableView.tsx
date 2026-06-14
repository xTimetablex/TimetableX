'use client';

import type { WheelEvent } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2 } from 'lucide-react';
import TimetableTable from './TimetableTable';
import { TimetableEntry } from '@/lib/types';

interface WeekTimetableDay {
  date: string;
  entries: TimetableEntry[];
  filteredEntries: TimetableEntry[];
  dayNotes?: string[];
  isWeekend?: boolean;
  isSelectionAvailable?: boolean;
}

interface WeekTimetableViewProps {
  days: WeekTimetableDay[];
  showClassColumn: boolean;
  selectionLabel?: string;
}

export default function WeekTimetableView({ days, showClassColumn, selectionLabel }: WeekTimetableViewProps) {
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const horizontalIntent = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);

    if (!horizontalIntent) return;

    const nextScrollLeft = el.scrollLeft + (event.shiftKey ? event.deltaY : event.deltaX || event.deltaY);
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    const canScroll = maxScrollLeft > 0 && (nextScrollLeft > 0 || nextScrollLeft < maxScrollLeft);

    if (!canScroll) return;

    event.preventDefault();
    el.scrollLeft = Math.max(0, Math.min(maxScrollLeft, nextScrollLeft));
  };

  return (
    <div
      className="overflow-x-auto overflow-y-visible p-4 sm:p-5 snap-x snap-mandatory scroll-smooth lg:snap-none lg:scroll-auto"
      style={{
        overscrollBehaviorX: 'none',
        overscrollBehaviorY: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollPaddingInline: '1rem',
      }}
      onWheel={handleWheel}
    >
      <div className="flex flex-nowrap gap-4 min-w-max pb-2">
        {days.map((day) => {
          const hasNotes = !!day.dayNotes?.length;
          const hasEntries = day.filteredEntries.length > 0;

          return (
            <section
            key={day.date}
            className="week-day-card panel-muted overflow-hidden shrink-0 snap-start lg:snap-none"
            style={{
              width: 'min(82vw, 24rem)',
              minWidth: '18rem',
              height: 'auto',
              maxHeight: 'none',
              scrollSnapStop: 'always',
            }}
          >
              <div
                className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5 border-b"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays
                      className="size-4 flex-shrink-0"
                      strokeWidth={2}
                      style={{ color: 'var(--color-primary)' }}
                    />
                    <p
                      className="text-sm font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {day.date}
                    </p>
                  </div>
                  <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                    {hasEntries ? `${day.filteredEntries.length} Einträge` : 'Keine Einträge'}
                  </p>
                </div>

              </div>

              <div className="overflow-hidden">
                {hasEntries ? (
                  <TimetableTable
                    entries={day.filteredEntries}
                    showClassColumn={showClassColumn}
                    compact
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-6 gap-3 text-center">
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      <CheckCircle2 className="size-6" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        Kein Unterricht für diese Auswahl
                      </p>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {!day.isSelectionAvailable && selectionLabel
                          ? `${selectionLabel} ist für diesen Tag nicht im Plan.`
                          : 'Dieser Tag ist leer oder alle passenden Einträge wurden ausgefiltert.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {hasNotes && (
                <div className="day-notes">
                  <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--color-warning)' }}>
                    <AlertCircle className="size-4 flex-shrink-0" strokeWidth={2} />
                    <span className="text-sm font-semibold">Hinweise</span>
                  </div>
                  <div className="space-y-1.5">
                    {day.dayNotes!.map((note, noteIndex) => (
                      <p
                        key={noteIndex}
                        className="text-sm leading-relaxed"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {note}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
