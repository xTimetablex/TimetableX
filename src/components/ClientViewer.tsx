'use client';

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import AppFooter from './AppFooter';
import BlacklistModal from './BlacklistModal';
import CommandPalette from './CommandPalette';
import DayContent from './DayContent';
import ErrorState from './ErrorState';
import FavoritesBar from './FavoritesBar';
import LoadingBar from './LoadingBar';
import LoginForm from './LoginForm';
import SelectionPrompt from './SelectionPrompt';
import TimetableHeader from './TimetableHeader';
import Toast from './Toast';
import WeekTimetableView from './WeekTimetableView';
import { AppSkeleton, TimetableBodySkeleton } from './TimetableSkeleton';

import { track } from '@/lib/analytics';
import {
  addDays,
  formatDateStr,
  formatDayLabel,
  formatUpdatedAt,
  formatWeekLabel,
  getDefaultDateStr,
  getSchoolWeekDates,
  getTodayStr,
  isValidDateStr,
  parseDateStr,
  shiftSchoolDay,
} from '@/lib/date';
import { getAvailableValues, sortNatural } from '@/lib/dayState';
import { entityKey } from '@/lib/history';
import { useAuth } from '@/lib/hooks/useAuth';
import { clearStoredHistory, useHistory } from '@/lib/hooks/useHistory';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { useSwipe } from '@/lib/hooks/useSwipe';
import { usePrefetchNeighbours, useTimetableDays } from '@/lib/hooks/useTimetable';
import {
  clearPreferences,
  isSameEntity,
  MAX_FAVORITES,
  setSelection,
  toggleBlacklistedSubject,
  toggleFavorite,
} from '@/lib/preferences';
import { getViewDates } from '@/lib/timetableQuery';
import { AuthIdentity, FilterMode, SearchItem, Selection, ViewMode } from '@/lib/types';

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

/** After this long in the background, the app jumps back to the default day. */
const RESET_AFTER_HIDDEN_MS = 2 * 60 * 60 * 1000;
const TOAST_DURATION_MS = 2600;

type NavigateTrigger = 'button' | 'keyboard' | 'swipe';

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
  const searchParams = useSearchParams();
  const [defaultDateStr, setDefaultDateStr] = useState(initialDefaultDateStr);
  const [todayStr, setTodayStr] = useState(initialTodayStr);

  const urlDate = searchParams.get('date');
  const viewMode: ViewMode = searchParams.get('view') === 'week' ? 'week' : 'day';
  const dateStr = isValidDateStr(urlDate) ? urlDate : defaultDateStr;

  // URL changes go through the History API: Next.js keeps useSearchParams in
  // sync without a server round trip, and replacing (not pushing) keeps the
  // back button from walking through every day you looked at.
  const navigate = useCallback((next: { date?: string | null; view?: ViewMode }) => {
    const params = new URLSearchParams(window.location.search);
    params.delete('step'); // from the old two-step flow
    if (next.date === null) params.delete('date');
    else if (next.date) params.set('date', next.date);
    if (next.view === 'week') params.set('view', 'week');
    else if (next.view === 'day') params.delete('view');
    const query = params.toString();
    window.history.replaceState(null, '', query ? `/app?${query}` : '/app');
  }, []);

  // Keep "today" current in long-running sessions, and after a long break
  // (a PWA resumed the next morning) go back to the day that matters now.
  useEffect(() => {
    let hiddenAt: number | null = null;

    const refreshClock = () => {
      setTodayStr(getTodayStr());
      setDefaultDateStr(getDefaultDateStr());
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      refreshClock();
      if (hiddenAt !== null && Date.now() - hiddenAt > RESET_AFTER_HIDDEN_MS) {
        navigate({ date: null });
      }
      hiddenAt = null;
    };

    const interval = setInterval(refreshClock, 60_000);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [navigate]);

  const prefs = usePreferences();
  const selection = prefs ? prefs.selection : undefined;
  const favorites = useMemo(() => prefs?.favorites ?? [], [prefs]);
  const blacklist = useMemo(
    () => (prefs?.selection ? prefs.blacklist[prefs.selection.value] ?? [] : []),
    [prefs]
  );

  const dates = useMemo(() => getViewDates(dateStr, viewMode), [dateStr, viewMode]);
  const { days, isFetching, authError, fatalError, refetch } = useTimetableDays(identity, dates);
  const primaryDay = viewMode === 'day' ? days[0] : days.find(day => day.dateStr === todayStr) ?? days[0];

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // The history (other classes/rooms/teachers, subjects) is only needed by the
  // picker and the subject dialog. Load it when one opens, when there is no
  // selection yet, or once the plan is on screen and the app is idle.
  const hasLoadedPlan = days.some(day => !!day.data);
  const [isIdle, setIsIdle] = useState(false);
  useEffect(() => {
    if (!hasLoadedPlan || isIdle) return;
    const id = setTimeout(() => setIsIdle(true), 2500);
    return () => clearTimeout(id);
  }, [hasLoadedPlan, isIdle]);

  const history = useHistory(
    identity,
    isPaletteOpen || isBlacklistOpen || selection === null || isIdle
  );

  usePrefetchNeighbours(identity, dateStr, viewMode === 'day' && !!days[0]?.data);

  const searchItems = useMemo(() => {
    const collect = (mode: FilterMode, fromHistory: string[] = []) => {
      const values = new Set(fromHistory);
      days.forEach(day => getAvailableValues(day.data, mode).forEach(value => values.add(value)));
      return sortNatural(values);
    };

    const items: SearchItem[] = [];
    const add = (type: FilterMode, values: string[]) =>
      values.forEach(name => items.push({ id: `${type}:${name}`, name, type }));
    add('class', collect('class', history.data?.classes));
    add('room', collect('room', history.data?.rooms));
    add('teacher', collect('teacher', history.data?.teachers));
    return items;
  }, [days, history.data]);

  const promptClasses = useMemo(
    () => searchItems.filter(item => item.type === 'class').map(item => item.name),
    [searchItems]
  );

  const blacklistSubjects = useMemo(() => {
    if (!selection) return [];
    const subjects = new Set(history.data?.subjects[entityKey(selection.mode, selection.value)] ?? []);
    days.forEach(day =>
      day.data?.entries.forEach(entry => {
        const matches =
          (selection.mode === 'class' && entry.class === selection.value) ||
          (selection.mode === 'room' && entry.room === selection.value) ||
          (selection.mode === 'teacher' && entry.teacher === selection.value);
        if (matches && entry.subject && entry.subject !== '---') subjects.add(entry.subject);
      })
    );
    blacklist.forEach(subject => subjects.add(subject));
    return sortNatural(subjects);
  }, [selection, history.data, days, blacklist]);

  // --- Actions -------------------------------------------------------------

  const chooseSelection = useCallback((next: Selection, source: 'picker' | 'favorite' | 'prompt') => {
    track(source === 'favorite' ? 'favorite_selected' : 'entity_selected', { filter_mode: next.mode });
    setSelection(next);
  }, []);

  const openPicker = useCallback((trigger: 'button' | 'keyboard') => {
    track('command_palette_opened', { trigger });
    // Commit synchronously so the input is focused inside the user gesture.
    flushSync(() => setIsPaletteOpen(true));
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

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (isPaletteOpen) setIsPaletteOpen(false);
      else if (!isBlacklistOpen) openPicker('keyboard');
      return;
    }

    if (isPaletteOpen || isBlacklistOpen) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

    switch (event.key) {
      case 'ArrowLeft':
        navigateBy(-1, 'keyboard');
        break;
      case 'ArrowRight':
        navigateBy(1, 'keyboard');
        break;
      case 't':
        goToToday();
        break;
      case 'd':
        changeViewMode('day');
        break;
      case 'w':
        changeViewMode('week');
        break;
      case 'r':
        refresh();
        break;
      case '/':
        event.preventDefault();
        openPicker('keyboard');
        break;
      default:
        return;
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const contentRef = useRef<HTMLDivElement>(null);
  useSwipe(
    contentRef,
    direction => navigateBy(direction, 'swipe'),
    viewMode === 'day' && !isPaletteOpen && !isBlacklistOpen
  );

  // --- Render --------------------------------------------------------------

  const weekDates = viewMode === 'week' ? getSchoolWeekDates(parseDateStr(dateStr)) : null;
  const dateLabel = weekDates
    ? formatWeekLabel(weekDates[0], weekDates[4])
    : formatDayLabel(parseDateStr(dateStr));
  const isToday = viewMode === 'week' ? dates.includes(todayStr) : dateStr === todayStr;
  const updatedLabel = formatUpdatedAt(primaryDay?.data?.updatedAt, todayStr);

  const dayContentProps = {
    blacklist,
    todayStr,
    onRetry: refresh,
    onRelogin: onLogout,
    onOpenBlacklist: () => setIsBlacklistOpen(true),
    onOpenPicker: () => openPicker('button'),
    onGoToDate: (date: string) => navigate({ date }),
  };

  let body;
  if (selection === undefined) {
    // Stored preferences are read right after hydration.
    body = <TimetableBodySkeleton viewMode={viewMode} />;
  } else if (authError) {
    body = (
      <div className="day-container">
        <ErrorState error={authError} onRetry={refresh} onRelogin={onLogout} />
      </div>
    );
  } else if (selection === null) {
    body = (
      <SelectionPrompt
        classes={promptClasses}
        isLoading={history.isFetching || days.some(day => day.isPending)}
        onSelect={next => chooseSelection(next, 'prompt')}
        onOpenPicker={() => openPicker('button')}
      />
    );
  } else if (fatalError && viewMode === 'week') {
    body = (
      <div className="day-container">
        <ErrorState error={fatalError} onRetry={refresh} onRelogin={onLogout} />
      </div>
    );
  } else if (viewMode === 'week') {
    body = (
      <WeekTimetableView
        {...dayContentProps}
        days={days}
        selection={selection}
        onOpenDay={date => navigate({ date, view: 'day' })}
      />
    );
  } else {
    body = (
      <div className="day-container">
        <div className="day-surface">
          <DayContent {...dayContentProps} day={days[0]} selection={selection} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <LoadingBar active={isFetching} />

      <TimetableHeader
        selection={selection}
        isFavorite={favorites.some(f => isSameEntity(f, selection))}
        onToggleFavorite={handleToggleFavorite}
        onOpenPicker={() => openPicker('button')}
        dateLabel={dateLabel}
        updatedLabel={updatedLabel}
        viewMode={viewMode}
        onChangeViewMode={changeViewMode}
        onNavigate={offset => navigateBy(offset, 'button')}
        onToday={goToToday}
        isToday={isToday}
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
        {body}
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
