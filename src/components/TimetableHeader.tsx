'use client';

import {
  ChevronLeft,
  ChevronRight,
  Home,
  Loader2,
  ShieldBan,
} from 'lucide-react';
import { ViewMode } from '@/lib/types';
import { Button } from './button';

interface TimetableHeaderProps {
  isLoading: boolean;
  dateText?: string;
  selectionLabel: string;
  onNavigate: (offset: number) => void;
  onBackToSelection?: () => void;
  onOpenBlacklist: () => void;
  isToday: boolean;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onToday: () => void;
}

export default function TimetableHeader({
  isLoading,
  dateText,
  selectionLabel,
  onNavigate,
  onBackToSelection,
  onOpenBlacklist,
  isToday,
  viewMode,
  onChangeViewMode,
  onToday,
}: TimetableHeaderProps) {
  const cleanDate = dateText ? dateText.replace(/\s*\(Aktualisiert:.*\)\s*$/u, '') : '';
  const navigateLabel = viewMode === 'week' ? 'Woche' : 'Tag';

  return (
    <div className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-2 min-w-0">
          {onBackToSelection && (
            <Button
              onClick={onBackToSelection}
              aria-label="Zur Auswahl"
              variant="icon"
            >
              <Home className="size-5" strokeWidth={2} />
            </Button>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
              {selectionLabel}
            </p>
            <h2 className="text-base font-semibold leading-tight truncate display flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              {isLoading ? (
                <>
                  <Loader2
                    className="size-4 animate-spin flex-shrink-0"
                    style={{ color: 'var(--color-primary)' }}
                    strokeWidth={2.5}
                  />
                  Aktualisiere…
                </>
              ) : (
                cleanDate || 'Stundenplan'
              )}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <div className="flex items-center gap-1 p-1 rounded-[var(--radius-md)] border"
               style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
            <Button
              onClick={() => onChangeViewMode('day')}
              variant={viewMode === 'day' ? 'primary' : 'ghost'} className="text-sm"
              style={{ height: 48, padding: '0 0.9rem' }}
            >
              Tag
            </Button>
            <Button
              onClick={() => onChangeViewMode('week')}
              variant={viewMode === 'week' ? 'primary' : 'ghost'} className="text-sm"
              style={{ height: 48, padding: '0 0.9rem' }}
            >
              Woche
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => onNavigate(-1)}
              aria-label={`Vorherige ${navigateLabel}`}
              variant="icon"
            >
              <ChevronLeft className="size-5" strokeWidth={2} />
            </Button>

          <Button
            onClick={onToday}
            aria-label="Heute"
            variant={isToday ? 'primary' : 'ghost'} className="text-sm"
            style={{ height: 48, padding: '0 0.9rem' }}
          >
            Heute
          </Button>

            <Button
              onClick={() => onNavigate(1)}
              aria-label={`Nächste ${navigateLabel}`}
              variant="icon"
            >
              <ChevronRight className="size-5" strokeWidth={2} />
            </Button>
          </div>

          <Button
            onClick={onOpenBlacklist}
            aria-label="Fächer verbergen"
            variant="icon"
          >
            <ShieldBan className="size-5 block" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </div>
  );
}
