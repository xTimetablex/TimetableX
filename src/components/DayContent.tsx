'use client';

import { AlertTriangle, Calendar, CalendarClock, CheckCircle2, EyeOff, Search } from 'lucide-react';
import { describeDay } from '@/lib/dayState';
import { shiftSchoolDay } from '@/lib/date';
import type { DayResult } from '@/lib/hooks/useTimetable';
import { Selection } from '@/lib/types';
import { Button } from './button';
import DayNotes from './DayNotes';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import LessonList from './LessonList';
import { LessonListSkeleton } from './TimetableSkeleton';

export interface DayContentProps {
  day: DayResult;
  selection: Selection;
  blacklist: string[];
  todayStr: string;
  compact?: boolean;
  onRetry: () => void;
  onRelogin: () => void;
  onOpenBlacklist: () => void;
  onOpenPicker: () => void;
  onGoToDate: (dateStr: string) => void;
}

function lessonsWord(count: number) {
  return count === 1 ? '1 Stunde' : `${count} Stunden`;
}

/** Notes plus lessons (or the matching empty/error state) of one day. */
export default function DayContent({
  day,
  selection,
  blacklist,
  todayStr,
  compact = false,
  onRetry,
  onRelogin,
  onOpenBlacklist,
  onOpenPicker,
  onGoToDate,
}: DayContentProps) {
  if (!day.data) {
    if (day.error) {
      return <ErrorState error={day.error} onRetry={onRetry} onRelogin={onRelogin} compact={compact} />;
    }
    return <LessonListSkeleton rows={compact ? 4 : 7} />;
  }

  const state = describeDay(day.data, selection, blacklist, todayStr);
  const outlineAction = (label: string, onClick: () => void, Icon?: typeof Search) => (
    <Button
      onClick={onClick}
      variant="outline"
      className="text-sm"
      style={{ padding: compact ? '0.5rem 1rem' : '0.625rem 1.25rem' }}
    >
      {Icon && <Icon className="size-4" strokeWidth={2} />}
      {label}
    </Button>
  );

  let body;
  switch (state.kind) {
    case 'weekend':
      body = (
        <EmptyState
          icon={Calendar}
          compact={compact}
          title="Wochenende"
          text="Am Wochenende gibt es keinen Vertretungsplan."
          action={outlineAction('Zum Montag', () => onGoToDate(shiftSchoolDay(day.dateStr, 1)))}
        />
      );
      break;
    case 'no-plan':
      body = state.future ? (
        <EmptyState
          icon={CalendarClock}
          compact={compact}
          title="Noch kein Plan"
          text="Für diesen Tag wurde noch kein Vertretungsplan veröffentlicht. Schau später noch einmal vorbei."
        />
      ) : (
        <EmptyState
          icon={Calendar}
          compact={compact}
          title="Kein Plan für diesen Tag"
          text="Für diesen Tag gibt es keinen Vertretungsplan, zum Beispiel wegen Ferien oder eines Feiertags."
        />
      );
      break;
    case 'not-in-plan':
      body = (
        <EmptyState
          icon={Search}
          compact={compact}
          title="Nicht im Plan"
          text={`${selection.value} steht an diesem Tag nicht im Plan.`}
          action={compact ? undefined : outlineAction('Andere Auswahl', onOpenPicker, Search)}
        />
      );
      break;
    case 'no-lessons':
      body = (
        <EmptyState
          icon={CheckCircle2}
          compact={compact}
          title="Keine Stunden"
          text={`${selection.value} hat an diesem Tag keine Stunden im Plan.`}
        />
      );
      break;
    case 'all-hidden':
      body = (
        <EmptyState
          icon={EyeOff}
          compact={compact}
          title="Alles ausgeblendet"
          text={`${lessonsWord(state.hiddenCount)} ${state.hiddenCount === 1 ? 'ist' : 'sind'} über „Fächer ausblenden“ versteckt.`}
          action={outlineAction('Ausgeblendete Fächer', onOpenBlacklist, EyeOff)}
        />
      );
      break;
    case 'lessons':
      body = (
        <>
          <LessonList entries={state.entries} showClass={selection.mode !== 'class'} />
          {state.hiddenCount > 0 && (
            <button type="button" className="hidden-lessons-note" onClick={onOpenBlacklist}>
              <EyeOff className="size-3.5" strokeWidth={2} aria-hidden />
              {lessonsWord(state.hiddenCount)} ausgeblendet
            </button>
          )}
        </>
      );
      break;
  }

  return (
    <>
      {day.error && (
        <p className="stale-note" role="status">
          <AlertTriangle className="size-3.5 flex-shrink-0" strokeWidth={2} aria-hidden />
          Aktualisierung fehlgeschlagen, das ist der zuletzt geladene Stand.
        </p>
      )}
      <DayNotes notes={day.data.dayNotes} compact={compact} />
      {body}
    </>
  );
}
