'use client';

import type { DayResult } from '@/lib/hooks/useTimetable';
import { Selection, ViewMode } from '@/lib/types';
import DayContent, { type DayContentProps } from './DayContent';
import ErrorState from './ErrorState';
import SelectionPrompt from './SelectionPrompt';
import { TimetableBodySkeleton } from './TimetableSkeleton';
import WeekTimetableView from './WeekTimetableView';

type SharedDayProps = Omit<DayContentProps, 'day' | 'selection' | 'compact'>;

interface TimetableBodyProps extends SharedDayProps {
  viewMode: ViewMode;
  /** `undefined` while the stored selection is still being read. */
  selection: Selection | null | undefined;
  days: DayResult[];
  authError: Error | null;
  fatalError: Error | null;
  /** Classes offered to first-time users. */
  promptClasses: string[];
  isPromptLoading: boolean;
  onSelectFromPrompt: (selection: Selection) => void;
  onOpenDay: (dateStr: string) => void;
}

function ErrorBody({ error, onRetry, onRelogin }: { error: Error; onRetry: () => void; onRelogin: () => void }) {
  return (
    <div className="day-container">
      <ErrorState error={error} onRetry={onRetry} onRelogin={onRelogin} />
    </div>
  );
}

/** The area below the header: the day, the week, or what to do first. */
export default function TimetableBody({
  viewMode,
  selection,
  days,
  authError,
  fatalError,
  promptClasses,
  isPromptLoading,
  onSelectFromPrompt,
  onOpenDay,
  ...dayProps
}: TimetableBodyProps) {
  // Stored preferences are read right after hydration.
  if (selection === undefined) return <TimetableBodySkeleton viewMode={viewMode} />;

  if (authError) return <ErrorBody error={authError} onRetry={dayProps.onRetry} onRelogin={dayProps.onRelogin} />;

  if (selection === null) {
    return (
      <SelectionPrompt
        classes={promptClasses}
        isLoading={isPromptLoading}
        onSelect={onSelectFromPrompt}
        onOpenPicker={dayProps.onOpenPicker}
      />
    );
  }

  if (viewMode === 'day') {
    return (
      <div className="day-container">
        <div className="day-surface">
          <DayContent {...dayProps} day={days[0]} selection={selection} />
        </div>
      </div>
    );
  }

  if (fatalError) return <ErrorBody error={fatalError} onRetry={dayProps.onRetry} onRelogin={dayProps.onRelogin} />;

  return <WeekTimetableView {...dayProps} days={days} selection={selection} onOpenDay={onOpenDay} />;
}
