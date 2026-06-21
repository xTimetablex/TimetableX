'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar, CheckCircle2, RefreshCw } from 'lucide-react';

import CommandPalette from './CommandPalette';
import LoginForm from './LoginForm';
import SelectionMenu from './SelectionMenu';
import TimetableHeader from './TimetableHeader';
import TimetableTable from './TimetableTable';
import BlacklistModal from './BlacklistModal';
import WeekTimetableView from './WeekTimetableView';
import LoadingBar from './LoadingBar';
import { TimetableSkeleton, WeekTimetableSkeleton } from './TimetableSkeleton';
import { Button } from './button';

import { useAuth } from '@/lib/hooks/useAuth';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { useTimetable } from '@/lib/hooks/useTimetable';
import { useAvailableSubjects } from '@/lib/hooks/useAvailableSubjects';
import { useExtendedEntities } from '@/lib/hooks/useExtendedEntities';
import { SearchItem, FilterMode, ViewMode } from '@/lib/types';
import { addDays, formatDateStr, getTodayStr, getWeekStart, parseDateStr } from '@/lib/date';
import { track } from '@/lib/analytics';

interface ClientViewerProps {
  currentDateStr?: string;
  currentViewMode?: ViewMode;
  currentStep?: 'selection' | 'timetable';
}

function pushDate(router: ReturnType<typeof useRouter>, dateStr: string, viewMode: ViewMode) {
  router.push(`/app?date=${dateStr}&view=${viewMode}&step=timetable`);
}

function getDayOffsetDate(dateStr: string | undefined, offset: number): string {
  const base = dateStr ? parseDateStr(dateStr) : new Date();
  const d = addDays(base, offset);

  if (offset > 0) {
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    else if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  } else if (offset < 0) {
    if (d.getDay() === 0) d.setDate(d.getDate() - 2);
    else if (d.getDay() === 6) d.setDate(d.getDate() - 1);
  }

  return formatDateStr(d);
}

function pushStep(router: ReturnType<typeof useRouter>, step: 'selection' | 'timetable', dateStr?: string, viewMode?: ViewMode) {
  const params = new URLSearchParams();
  if (dateStr) params.set('date', dateStr);
  if (viewMode) params.set('view', viewMode);
  if (step === 'timetable') params.set('step', 'timetable');
  router.push(`/app?${params.toString()}`);
}

const selectionModeLabel: Record<FilterMode, string> = {
  class: 'Klasse',
  room: 'Raum',
  teacher: 'Lehrer',
};

export default function ClientViewer({ currentDateStr, currentViewMode = 'day', currentStep = 'selection' }: ClientViewerProps) {
  const router = useRouter();
  const { creds, isLogged, login, logout, isInitialized } = useAuth();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const {
    data,
    error,
    isLoading,
    filteredEntries,
    filterMode,
    setFilterMode,
    selectedValue,
    setSelectedValue,
    currentBlacklist,
    addToBlacklist,
    removeFromBlacklist,
    filteredDays,
    refetch,
    isSelectionAvailable,
  } = useTimetable(creds, currentDateStr, currentViewMode);

  const { availableSubjects, isLoadingSubjects } = useAvailableSubjects(
    creds,
    filterMode,
    selectedValue
  );

  const { extendedClasses, extendedRooms, extendedTeachers } = useExtendedEntities(creds);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => {
          if (!prev) track('command_palette_opened', { trigger: 'keyboard' });
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (item: SearchItem) => {
    track('entity_selected', { filter_mode: item.type });
    setFilterMode(item.type as FilterMode);
    setSelectedValue(item.name);
  };

  const searchItems = useMemo(() => {
    const currentClasses  = data?.availableClasses ?? [];
    const currentRooms    = data?.availableRooms ?? [];
    const currentTeachers = data?.availableTeachers ?? [];

    const allClasses  = Array.from(new Set([...currentClasses,  ...extendedClasses])).sort();
    const allRooms    = Array.from(new Set([...currentRooms,    ...extendedRooms])).sort();
    const allTeachers = Array.from(new Set([...currentTeachers, ...extendedTeachers])).sort();

    const items: SearchItem[] = [];
    allClasses.forEach(c => items.push({ id: c, name: c, type: 'class' }));
    allRooms.forEach(r => items.push({ id: r, name: r, type: 'room' }));
    allTeachers.forEach(t => items.push({ id: t, name: t, type: 'teacher' }));
    return items;
  }, [data, extendedClasses, extendedRooms, extendedTeachers]);

  const navigateDay = (offset: number) => {
    track('date_navigated', { direction: offset > 0 ? 'forward' : 'backward', view_mode: currentViewMode });
    const nextDate = currentViewMode === 'week'
      ? formatDateStr(addDays(currentDateStr ? parseDateStr(currentDateStr) : new Date(), offset * 7))
      : getDayOffsetDate(currentDateStr, offset);

    pushDate(router, nextDate, currentViewMode);
  };

  if (!isInitialized) return null;
  if (!isLogged) return <LoginForm onLogin={login} />;

  const todayStr = getTodayStr();
  const currentDate = currentDateStr ? parseDateStr(currentDateStr) : new Date();
  const currentWeekStartStr = formatDateStr(getWeekStart(currentDate));
  const todayWeekStartStr = formatDateStr(getWeekStart(new Date()));
  const isToday = currentViewMode === 'week'
    ? currentWeekStartStr === todayWeekStartStr
    : !currentDateStr || currentDateStr === todayStr;

  const isWeekData = !!data && 'days' in data;
  const isEmptyDay =
    !isWeekData && (data?.isWeekend || (data && data.entries.length === 0 && !data.dayNotes?.length));
  const isEmptyWeek =
    isWeekData &&
    filteredDays.length > 0 &&
    filteredDays.every(day => day.filteredEntries.length === 0) &&
    filteredDays.every(day => !day.dayNotes?.length);
  const selectionLabel = `${selectionModeLabel[filterMode]}: ${selectedValue || '—'}`;

  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <LoadingBar active={isLoading} />
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelect={handleSelect}
        items={searchItems}
      />
      <BlacklistModal
        isOpen={isBlacklistOpen}
        onClose={() => setIsBlacklistOpen(false)}
        currentEntity={selectedValue}
        availableSubjects={availableSubjects}
        isLoadingSubjects={isLoadingSubjects}
        currentBlacklist={currentBlacklist}
        addToBlacklist={addToBlacklist}
        removeFromBlacklist={removeFromBlacklist}
      />

      <div className="flex-1">
        {currentStep === 'selection' ? (
          <section className="flex min-h-[100dvh] items-start justify-center px-4 pb-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl mx-auto">
            <SelectionMenu
              filterMode={filterMode}
              selectedValue={selectedValue}
              onOpenPalette={() => { track('command_palette_opened', { trigger: 'button' }); setIsPaletteOpen(true); }}
              isFavorite={isFavorite(filterMode, selectedValue)}
              onToggleFavorite={() => toggleFavorite(filterMode, selectedValue)}
              onLogout={logout}
              favorites={favorites}
              onSelectFavorite={(mode, value) => {
                track('favorite_selected', { filter_mode: mode });
                setFilterMode(mode);
                setSelectedValue(value);
              }}
              onContinue={() => pushStep(router, 'timetable', currentDateStr || getTodayStr(), currentViewMode)}
            />
          </div>
        </section>
      ) : (
        <section className="panel panel-flat">
          <TimetableHeader
            isLoading={isLoading}
            dateText={data?.date}
            selectionLabel={selectionLabel}
            onNavigate={navigateDay}
            onBackToSelection={() => pushStep(router, 'selection', currentDateStr, currentViewMode)}
            onOpenBlacklist={() => setIsBlacklistOpen(true)}
            isToday={isToday}
            viewMode={currentViewMode}
            onChangeViewMode={(mode) => {
              track('view_mode_changed', { view: mode });
              const nextDate = currentDateStr || todayStr;
              pushDate(router, nextDate, mode);
            }}
            onToday={() => {
              track('navigate_to_today', { view_mode: currentViewMode });
              const today = getTodayStr();
              pushDate(router, today, currentViewMode);
            }}
          />

          <div>
            {isLoading && !data ? (
              <>
                <output className="sr-only">Daten werden geladen…</output>
                {currentViewMode === 'week' ? (
                  <WeekTimetableSkeleton showClassColumn={filterMode !== 'class'} />
                ) : (
                  <TimetableSkeleton showClassColumn={filterMode !== 'class'} rows={8} />
                )}
              </>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 gap-5 text-center">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--color-danger-bg)',
                    color: 'var(--color-danger)',
                  }}
                >
                  <AlertCircle className="size-7" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    {error.message}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Der Plan existiert möglicherweise noch nicht oder die Anmeldedaten sind abgelaufen.
                  </p>
                </div>
                <Button
                  onClick={() => { track('timetable_refreshed'); refetch(); }}
                  variant="primary" className="text-sm"
                  style={{ padding: '0.75rem 1.5rem' }}
                >
                  <RefreshCw className="size-4" strokeWidth={2} />
                  Erneut versuchen
                </Button>
              </div>
            ) : isEmptyDay ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 gap-5 text-center">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {data?.isWeekend
                    ? <Calendar className="size-7" strokeWidth={1.75} />
                    : <CheckCircle2 className="size-7" strokeWidth={1.75} />
                  }
                </div>
                <div>
                  <p className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    {data?.isWeekend ? 'Wochenende' : 'Kein Unterricht'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {data?.isWeekend
                      ? 'Genieß die freie Zeit! Es ist kein Plan verfügbar.'
                      : 'An diesem Tag findet kein Unterricht statt oder der Plan ist noch nicht verfügbar.'}
                  </p>
                </div>
                <Button
                  onClick={() => { track('timetable_refreshed'); refetch(); }}
                  variant="outline" className="text-sm"
                  style={{ padding: '0.625rem 1.25rem' }}
                >
                  <RefreshCw className="size-3.5" strokeWidth={2} />
                  Aktualisieren
                </Button>
              </div>
            ) : isEmptyWeek ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 gap-5 text-center">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                  }}
                >
                  <Calendar className="size-7" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    Keine Einträge in dieser Woche
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Für die aktuelle Auswahl gibt es in dieser Woche keine passenden Vertretungen.
                  </p>
                </div>
                <Button
                  onClick={() => { track('timetable_refreshed'); refetch(); }}
                  variant="outline" className="text-sm"
                  style={{ padding: '0.625rem 1.25rem' }}
                >
                  <RefreshCw className="size-3.5" strokeWidth={2} />
                  Aktualisieren
                </Button>
              </div>
            ) : data ? (
              currentViewMode === 'week' && isWeekData ? (
                <WeekTimetableView
                  days={filteredDays}
                  showClassColumn={filterMode !== 'class'}
                  selectionLabel={selectedValue}
                />
              ) : (
                <TimetableTable
                  entries={filteredEntries}
                  showClassColumn={filterMode !== 'class'}
                  isSelectionAvailable={isSelectionAvailable}
                  selectionLabel={selectedValue}
                />
              )
            ) : null}
          </div>

          {!isWeekData && data?.dayNotes && data.dayNotes.length > 0 && (
            <div className="day-notes">
              <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--color-warning)' }}>
                <AlertCircle className="size-4 flex-shrink-0" strokeWidth={2} />
                <span className="text-sm font-semibold">Besondere Hinweise</span>
              </div>
              <div className="space-y-1.5">
                {data.dayNotes.map((note) => (
                  <p
                    key={note}
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
      )}
      </div>

      <footer
        className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm sm:flex-row sm:px-6 lg:px-8 mt-auto"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <p className="text-center sm:text-left">TimetableX</p>
        <nav className="flex items-center gap-4">
          <Link
            href="/datenschutz"
            className="transition-colors hover:text-[var(--color-text)]"
          >
            Datenschutz
          </Link>
          <Link
            href="/impressum"
            className="transition-colors hover:text-[var(--color-text)]"
          >
            Impressum
          </Link>
        </nav>
      </footer>
    </div>
  );
}
