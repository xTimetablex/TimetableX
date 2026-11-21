'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import AppFooter from './AppFooter';
import BlacklistModal from './BlacklistModal';
import CommandPalette from './CommandPalette';
import FavoritesBar from './FavoritesBar';
import LoadingBar from './LoadingBar';
import LoginForm from './LoginForm';
import TimetableBody from './TimetableBody';
import TimetableHeader from './TimetableHeader';
import Toast from './Toast';
import { AppSkeleton } from './TimetableSkeleton';

import { track } from '@/lib/analytics';
import {
  addDays,
  formatDateStr,
  formatDayLabel,
  formatUpdatedAt,
  formatWeekLabel,
  getSchoolWeekDates,
  getTodayStr,
  parseDateStr,
  shiftSchoolDay,
} from '@/lib/date';
import { useAppShortcuts } from '@/lib/hooks/useAppShortcuts';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBecomesTrueAfter } from '@/lib/hooks/useBecomesTrueAfter';
import { clearStoredHistory, useHistory } from '@/lib/hooks/useHistory';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { useSwipe } from '@/lib/hooks/useSwipe';
import { usePrefetchNeighbours, useTimetableDays } from '@/lib/hooks/useTimetable';
import { useToast } from '@/lib/hooks/useToast';
import { useViewState } from '@/lib/hooks/useViewState';
import {
  clearPreferences,
  isSameEntity,
  MAX_FAVORITES,
  setSelection,
  toggleBlacklistedSubject,
  toggleFavorite,
} from '@/lib/preferences';
import { buildSearchItems, collectSubjects } from '@/lib/searchIndex';
import { getViewDates } from '@/lib/timetableQuery';
import { AuthIdentity, Selection, ViewMode } from '@/lib/types';

interface ClientViewerProps {
  /** Read from the session cookie by the server; `null` shows the login form. */
  initialIdentity: AuthIdentity | null;
  /** Computed on the server so both sides render the same day. */
  defaultDateStr: string;
  todayStr: string;
}

export default function ClientViewer({ initialIdentity, defaultDateStr, todayStr }: ClientViewerProps) {
  const { identity, isMigrating, login, logout } = useAuth(initialIdentity);
  const queryClient = useQueryClient();

  const handleLogout = useCallback(async () => {
    await logout();
    // Start clean, e.g. for the next person on a shared school computer.
    clearPreferences();
    clearStoredHistory();
    queryClient.clear();
  }, [logout, queryClient]);

  if (!identity) {
    if (isMigrating) return <AppSkeleton viewMode="day" />;
    return <LoginForm onLogin={login} />;
  }

  return (
    <TimetableApp
      identity={identity}
      initialDefaultDateStr={defaultDateStr}
      initialTodayStr={todayStr}
      onLogout={handleLogout}
    />
  );
}

type NavigateTrigger = 'button' | 'keyboard' | 'swipe';

/** How long the plan must be on screen before the history loads in the background. */
const HISTORY_IDLE_DELAY_MS = 2500;

function TimetableApp({
  identity,
  initialDefaultDateStr,
  initialTodayStr,
  onLogout,
}: {
  identity: AuthIdentity;
  initialDefaultDateStr: string;
  initialTodayStr: string;
  onLogout: () => void;
}) {
  const { dateStr, viewMode, todayStr, navigate } = useViewState(initialDefaultDateStr, initialTodayStr);
  const { selection, favorites, blacklist } = useSelectionPrefs();
  const { toast, showToast } = useToast();

  const dates = useMemo(() => getViewDates(dateStr, viewMode), [dateStr, viewMode]);
  const { days, isFetching, authError, fatalError, refetch } = useTimetableDays(identity, dates);
  const plans = useMemo(() => days.map(day => day.data), [days]);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
  const isDialogOpen = isPaletteOpen || isBlacklistOpen;

  // The history (other classes/rooms/teachers, subjects) is only needed by the
  // picker and the subject dialog. Load it when one opens, when there is no
  // selection yet, or once the plan is on screen and the app is idle.
  const isIdle = useBecomesTrueAfter(plans.some(Boolean), HISTORY_IDLE_DELAY_MS);
  const history = useHistory(identity, isDialogOpen || selection === null || isIdle);

  usePrefetchNeighbours(identity, dateStr, viewMode === 'day' && !!plans[0]);

  const searchItems = useMemo(() => buildSearchItems(plans, history.data), [plans, history.data]);
  const promptClasses = useMemo(
    () => searchItems.filter(item => item.type === 'class').map(item => item.name),
    [searchItems]
  );
  const blacklistSubjects = useMemo(
    () => collectSubjects(selection, plans, history.data, blacklist),
    [selection, plans, history.data, blacklist]
  );

  // --- Actions -------------------------------------------------------------

  const chooseSelection = useCallback((next: Selection, source: 'picker' | 'favorite' | 'prompt') => {
    track(source === 'favorite' ? 'favorite_selected' : 'entity_selected', { filter_mode: next.mode });
    setSelection(next);
  }, []);

  const openPicker = useCallback((trigger: 'button' | 'keyboard') => {
    track('command_palette_opened', { trigger });
    setIsPaletteOpen(true);
  }, []);

  const navigateBy = useCallback((offset: 1 | -1, trigger: NavigateTrigger) => {
    track('date_navigated', { direction: offset > 0 ? 'forward' : 'backward', view_mode: viewMode, trigger });
    const next = viewMode === 'week'
      ? formatDateStr(addDays(parseDateStr(dateStr), offset * 7))
      : shiftSchoolDay(dateStr, offset);
    navigate({ date: next });
  }, [dateStr, viewMode, navigate]);

  const goToToday = useCallback(() => {
    track('navigate_to_today', { view_mode: viewMode });
    navigate({ date: getTodayStr() });
  }, [viewMode, navigate]);

  const changeViewMode = useCallback((mode: ViewMode) => {
    if (mode === viewMode) return;
    track('view_mode_changed', { view: mode });
    navigate({ view: mode, date: dateStr });
  }, [viewMode, dateStr, navigate]);

  const refresh = useCallback(() => {
    track('timetable_refreshed');
    void refetch();
  }, [refetch]);

  const handleToggleFavorite = () => {
    if (!selection) return;
    const result = toggleFavorite(selection);
    if (result === 'limit') {
      showToast(`Maximal ${MAX_FAVORITES} Favoriten. Entferne zuerst einen anderen.`);
      return;
    }
    track('favorite_toggled', { action: result, filter_mode: selection.mode });
    showToast(result === 'added' ? `${selection.value} ist jetzt ein Favorit` : `${selection.value} aus Favoriten entfernt`);
  };

  const handleToggleSubject = (subject: string) => {
    if (!selection) return;
    const result = toggleBlacklistedSubject(selection.value, subject);
    track('blacklist_subject_toggled', { action: result });
  };

  // --- Keyboard shortcuts and swipe ----------------------------------------

  useAppShortcuts(
    {
      togglePicker: () => {
        if (isPaletteOpen) setIsPaletteOpen(false);
        else if (!isBlacklistOpen) openPicker('keyboard');
      },
      openPicker: () => openPicker('keyboard'),
      navigate: offset => navigateBy(offset, 'keyboard'),
      today: goToToday,
      view: changeViewMode,
      refresh,
    },
    isDialogOpen
  );

  const contentRef = useRef<HTMLDivElement>(null);
  useSwipe(contentRef, direction => navigateBy(direction, 'swipe'), viewMode === 'day' && !isDialogOpen);

  // --- Render --------------------------------------------------------------

  const primaryDay = viewMode === 'day' ? days[0] : days.find(day => day.dateStr === todayStr) ?? days[0];

  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <LoadingBar active={isFetching} />

      <TimetableHeader
        selection={selection}
        isFavorite={favorites.some(f => isSameEntity(f, selection))}
        onToggleFavorite={handleToggleFavorite}
        onOpenPicker={() => openPicker('button')}
        dateLabel={formatViewLabel(dateStr, viewMode)}
        updatedLabel={formatUpdatedAt(primaryDay?.data?.updatedAt, todayStr)}
        viewMode={viewMode}
        onChangeViewMode={changeViewMode}
        onNavigate={offset => navigateBy(offset, 'button')}
        onToday={goToToday}
        isToday={dates.includes(todayStr)}
        onRefresh={refresh}
        isRefreshing={isFetching}
        onOpenBlacklist={() => setIsBlacklistOpen(true)}
      />

      <FavoritesBar
        favorites={favorites}
        selection={selection ?? null}
        onSelect={favorite => chooseSelection(favorite, 'favorite')}
      />

      <div ref={contentRef} className="flex-1">
        <TimetableBody
          viewMode={viewMode}
          selection={selection}
          days={days}
          authError={authError}
          fatalError={fatalError}
          promptClasses={promptClasses}
          isPromptLoading={history.isFetching || days.some(day => day.isPending)}
          onSelectFromPrompt={next => chooseSelection(next, 'prompt')}
          onOpenDay={date => navigate({ date, view: 'day' })}
          blacklist={blacklist}
          todayStr={todayStr}
          onRetry={refresh}
          onRelogin={onLogout}
          onOpenBlacklist={() => setIsBlacklistOpen(true)}
          onOpenPicker={() => openPicker('button')}
          onGoToDate={date => navigate({ date })}
        />
      </div>

      <AppFooter identity={identity} onLogout={onLogout} />

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelect={next => chooseSelection(next, 'picker')}
        items={searchItems}
        favorites={favorites}
        current={selection ?? null}
        isLoadingMore={history.isFetching}
      />

      <BlacklistModal
        isOpen={isBlacklistOpen && !!selection}
        onClose={() => setIsBlacklistOpen(false)}
        entityLabel={selection?.value ?? ''}
        subjects={blacklistSubjects}
        hidden={blacklist}
        isLoading={history.isFetching}
        onToggle={handleToggleSubject}
      />

      <Toast message={toast} />
    </div>
  );
}

/** The stored selection, favorites and the subjects hidden for the selection. */
function useSelectionPrefs() {
  const prefs = usePreferences();
  const favorites = useMemo(() => prefs?.favorites ?? [], [prefs]);
  const blacklist = useMemo(
    () => (prefs?.selection ? prefs.blacklist[prefs.selection.value] ?? [] : []),
    [prefs]
  );
  // `undefined` until the stored preferences are read after hydration.
  return { selection: prefs ? prefs.selection : undefined, favorites, blacklist };
}

function formatViewLabel(dateStr: string, viewMode: ViewMode): string {
  const date = parseDateStr(dateStr);
  if (viewMode === 'day') return formatDayLabel(date);
  const week = getSchoolWeekDates(date);
  return formatWeekLabel(week[0], week[4]);
}
