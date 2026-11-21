'use client';

import { useEffect, useRef } from 'react';
import { describeDay } from '@/lib/dayState';
import { formatShortDate, formatWeekday, parseDateStr } from '@/lib/date';
import DayContent, { DayContentProps } from './DayContent';

type WeekTimetableViewProps = Omit<DayContentProps, 'day' | 'compact'> & {
  days: DayContentProps['day'][];
  /** Opens a day in the day view. */
  onOpenDay: (dateStr: string) => void;
};

function summary(props: WeekTimetableViewProps, day: DayContentProps['day']): string {
  if (!day.data) return day.error ? 'Fehler' : 'Lädt…';
  const state = describeDay(day.data, props.selection, props.blacklist, props.todayStr);
  if (state.kind === 'lessons') {
    return state.entries.length === 1 ? '1 Stunde' : `${state.entries.length} Stunden`;
  }
  if (state.kind === 'no-plan') return state.future ? 'Noch kein Plan' : 'Kein Plan';
  return 'Keine Stunden';
}

/**
 * Monday–Friday side by side. On large screens all five fit as a grid; below
 * that the days scroll horizontally (snapping per day), starting at today.
 */
export default function WeekTimetableView(props: WeekTimetableViewProps) {
  const { days, todayStr, onOpenDay } = props;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const weekKey = days.map(day => day.dateStr).join();

  // Start on today's card when the week doesn't fit on screen.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const today = scroller?.querySelector<HTMLElement>('[aria-current="date"]');
    if (!scroller || !today || scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollTo({ left: today.offsetLeft - parseFloat(getComputedStyle(scroller).paddingLeft), behavior: 'instant' });
  }, [weekKey]);

  return (
    <div className="week-scroller" ref={scrollerRef}>
      <div className="week-grid">
        {days.map(day => {
          const date = parseDateStr(day.dateStr);
          const isToday = day.dateStr === todayStr;

          return (
            <section
              key={day.dateStr}
              className="week-day panel-muted"
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${formatWeekday(date)}, ${formatShortDate(date)}`}
            >
              <button
                type="button"
                className="week-day-header"
                onClick={() => onOpenDay(day.dateStr)}
                aria-label={`${formatWeekday(date)} in der Tagesansicht öffnen`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                    {formatWeekday(date)}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {formatShortDate(date)}
                  </span>
                  {isToday && <span className="today-badge">Heute</span>}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {summary(props, day)}
                </span>
              </button>

              <DayContent {...props} day={day} compact />
            </section>
          );
        })}
      </div>
    </div>
  );
}
