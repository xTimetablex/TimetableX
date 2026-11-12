'use client';

import { ChevronDown, ChevronLeft, ChevronRight, EyeOff, RefreshCw, Star } from 'lucide-react';
import { Selection, ViewMode } from '@/lib/types';
import { Button } from './button';
import { MODE_LABEL } from '@/lib/modeLabels';
import { ModeIcon } from './ModeIcon';

interface TimetableHeaderProps {
  /** `undefined` while the stored selection is still being read. */
  selection: Selection | null | undefined;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenPicker: () => void;
  dateLabel: string;
  updatedLabel: string | null;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onNavigate: (offset: 1 | -1) => void;
  onToday: () => void;
  isToday: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenBlacklist: () => void;
}

export default function TimetableHeader({
  selection,
  isFavorite,
  onToggleFavorite,
  onOpenPicker,
  dateLabel,
  updatedLabel,
  viewMode,
  onChangeViewMode,
  onNavigate,
  onToday,
  isToday,
  onRefresh,
  isRefreshing,
  onOpenBlacklist,
}: TimetableHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="flex items-center gap-2">
          <SelectionButton selection={selection} onOpenPicker={onOpenPicker} />

          {selection && (
            <Button
              onClick={onToggleFavorite}
              aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              aria-pressed={isFavorite}
              variant="icon"
              className="flex-shrink-0"
            >
              <Star className="size-5 block" fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2} />
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <Button onClick={onRefresh} aria-label="Plan aktualisieren" variant="icon" disabled={isRefreshing}>
              <RefreshCw className={`size-5 block ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
            </Button>
            <Button
              onClick={onOpenBlacklist}
              aria-label="Fächer ausblenden"
              variant="icon"
              disabled={!selection}
            >
              <EyeOff className="size-5 block" strokeWidth={2} />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h1 className="display text-lg font-semibold leading-tight sm:text-xl" style={{ color: 'var(--color-text)' }}>
              {dateLabel}
            </h1>
            {updatedLabel && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {updatedLabel}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ViewModeToggle viewMode={viewMode} onChange={onChangeViewMode} />
            <DateStepper viewMode={viewMode} onNavigate={onNavigate} onToday={onToday} isToday={isToday} />
          </div>
        </div>
      </div>
    </header>
  );
}

/** Shows the current class/room/teacher and opens the picker. */
function SelectionButton({
  selection,
  onOpenPicker,
}: Pick<TimetableHeaderProps, 'selection' | 'onOpenPicker'>) {
  const modeLabel = selection ? MODE_LABEL[selection.mode] : null;

  let value;
  if (selection === undefined) {
    value = <span className="skeleton mt-1" style={{ width: 60, height: 16 }} />;
  } else {
    value = (
      <span className="block truncate text-base font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
        {selection?.value ?? 'Wählen…'}
      </span>
    );
  }

  return (
    <Button
      onClick={onOpenPicker}
      aria-haspopup="dialog"
      aria-label={selection ? `${modeLabel} ${selection.value}, Auswahl ändern` : 'Klasse, Raum oder Lehrer auswählen'}
      className="search-trigger search-trigger-compact flex-1 min-w-0 sm:flex-none sm:w-72"
    >
      <span className="mode-icon-box" aria-hidden>
        <ModeIcon mode={selection?.mode ?? 'class'} size={18} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-xs font-medium leading-tight" style={{ color: 'var(--color-text-secondary)' }}>
          {modeLabel ?? 'Auswahl'}
        </span>
        {value}
      </span>
      <kbd className="kbd hidden sm:flex">⌘K</kbd>
      <ChevronDown className="size-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} aria-hidden />
    </Button>
  );
}

const VIEW_MODES: { mode: ViewMode; label: string }[] = [
  { mode: 'day', label: 'Tag' },
  { mode: 'week', label: 'Woche' },
];

function ViewModeToggle({ viewMode, onChange }: { viewMode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-[var(--radius-md)] border"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
      role="group"
      aria-label="Ansicht"
    >
      {VIEW_MODES.map(({ mode, label }) => (
        <Button
          key={mode}
          onClick={() => onChange(mode)}
          aria-pressed={viewMode === mode}
          variant={viewMode === mode ? 'primary' : 'ghost'}
          className="text-sm"
          style={{ height: 44, padding: '0 0.85rem' }}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

/** ‹ Heute › */
function DateStepper({
  viewMode,
  onNavigate,
  onToday,
  isToday,
}: Pick<TimetableHeaderProps, 'viewMode' | 'onNavigate' | 'onToday' | 'isToday'>) {
  const isWeek = viewMode === 'week';
  return (
    <>
      <Button onClick={() => onNavigate(-1)} aria-label={isWeek ? 'Vorherige Woche' : 'Vorheriger Tag'} variant="icon">
        <ChevronLeft className="size-5" strokeWidth={2} />
      </Button>
      <Button
        onClick={onToday}
        aria-pressed={isToday}
        variant={isToday ? 'primary' : 'ghost'}
        className="text-sm"
        style={{ height: 48, padding: '0 0.85rem' }}
      >
        Heute
      </Button>
      <Button onClick={() => onNavigate(1)} aria-label={isWeek ? 'Nächste Woche' : 'Nächster Tag'} variant="icon">
        <ChevronRight className="size-5" strokeWidth={2} />
      </Button>
    </>
  );
}
