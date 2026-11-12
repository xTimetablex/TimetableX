'use client';

import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Search, Star, X } from 'lucide-react';
import { isSameEntity } from '@/lib/preferences';
import { useCloseOnBack } from '@/lib/hooks/useCloseOnBack';
import { Favorite, FilterMode, SearchItem, Selection } from '@/lib/types';
import { Button } from './button';
import { MODE_LABEL, MODE_LABEL_PLURAL, ModeIcon } from './ModeIcon';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selection: Selection) => void;
  /** Every known class, room and teacher, sorted. */
  items: SearchItem[];
  favorites: Favorite[];
  current: Selection | null;
  /** True while older plans are still being searched for more entries. */
  isLoadingMore: boolean;
}

const MODES: FilterMode[] = ['class', 'room', 'teacher'];
const MAX_RESULTS_PER_GROUP = 30;

interface Group {
  key: string;
  label: string;
  icon?: 'star';
  options: { id: string; selection: Selection }[];
}

function rank(name: string, query: string): number {
  const lower = name.toLowerCase();
  if (lower === query) return 0;
  if (lower.startsWith(query)) return 1;
  return 2;
}

function buildGroups(items: SearchItem[], favorites: Favorite[], query: string, idPrefix: string): Group[] {
  const groups: Group[] = [];
  const toOption = (selection: Selection, group: string) => ({
    id: `${idPrefix}-${group}-${selection.mode}-${selection.value}`,
    selection,
  });

  if (!query && favorites.length > 0) {
    groups.push({
      key: 'favorites',
      label: 'Favoriten',
      icon: 'star',
      options: favorites.map(f => toOption(f, 'fav')),
    });
  }

  for (const mode of MODES) {
    let matches = items.filter(item => item.type === mode);
    if (query) {
      matches = matches
        .filter(item => item.name.toLowerCase().includes(query))
        .map((item, index) => ({ item, index, rank: rank(item.name, query) }))
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .slice(0, MAX_RESULTS_PER_GROUP)
        .map(({ item }) => item);
    }
    if (matches.length > 0) {
      groups.push({
        key: mode,
        label: MODE_LABEL_PLURAL[mode],
        options: matches.map(item => toOption({ mode, value: item.name }, mode)),
      });
    }
  }

  return groups;
}

/**
 * Picker for the class, room or teacher. With an empty search it lists
 * favorites and everything known, so a tap is enough; typing filters.
 */
export default function CommandPalette(props: CommandPaletteProps) {
  useCloseOnBack(props.isOpen, props.onClose);
  if (!props.isOpen) return null;
  // Mounted fresh on every open, so the search always starts empty.
  return <PaletteDialog {...props} />;
}

function PaletteDialog({ onClose, onSelect, items, favorites, current, isLoadingMore }: CommandPaletteProps) {
  const idPrefix = useId();
  const listboxId = `${idPrefix}-listbox`;
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typing is the fast path with a keyboard. On touch screens the list is,
  // and popping up the on-screen keyboard would cover half of it.
  const [autoFocus] = useState(() => window.matchMedia('(pointer: fine)').matches);

  const query = search.trim().toLowerCase();
  const groups = useMemo(
    () => buildGroups(items, favorites, query, idPrefix),
    [items, favorites, query, idPrefix]
  );
  const options = useMemo(() => groups.flatMap(group => group.options), [groups]);
  const activeOption = options[Math.min(activeIndex, options.length - 1)];

  // Give focus back to whatever opened the picker. Captured during render,
  // before autoFocus moves focus into the input.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  useEffect(() => {
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [opener]);

  useEffect(() => {
    if (activeOption) document.getElementById(activeOption.id)?.scrollIntoView({ block: 'nearest' });
  }, [activeOption]);

  const choose = (selection: Selection) => {
    onSelect(selection);
    onClose();
  };

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault();
      setActiveIndex(index => (Math.min(index, options.length - 1) + 1) % options.length);
    } else if (event.key === 'ArrowUp' && options.length > 0) {
      event.preventDefault();
      setActiveIndex(index => (Math.min(index, options.length - 1) - 1 + options.length) % options.length);
    } else if (event.key === 'Enter' && activeOption && event.target === inputRef.current) {
      event.preventDefault();
      choose(activeOption.selection);
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[6vh] sm:pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Klasse, Raum oder Lehrer auswählen"
    >
      <div className="fixed inset-0 palette-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-xl overflow-hidden palette-panel">
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Search className="size-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} strokeWidth={2} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus={autoFocus}
            placeholder="Klasse, Raum oder Lehrer suchen…"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOption?.id}
            className="flex-1 min-w-0 bg-transparent border-none outline-none palette-input"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setActiveIndex(0);
            }}
          />
          <Button onClick={onClose} aria-label="Schließen" variant="icon" style={{ width: 44, height: 44 }}>
            <X className="size-4" strokeWidth={2.5} />
          </Button>
        </div>

        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: '62vh' }}>
          {options.length > 0 ? (
            <div id={listboxId} role="listbox" aria-label="Ergebnisse" className="p-2">
              {groups.map(group => (
                <div key={group.key} role="group" aria-labelledby={`${idPrefix}-${group.key}-label`}>
                  <div
                    id={`${idPrefix}-${group.key}-label`}
                    className="flex items-center gap-1.5 px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {group.icon === 'star' && <Star className="size-3" strokeWidth={2.5} aria-hidden />}
                    {group.label}
                  </div>

                  {group.options.map(option => {
                    const isActive = option.id === activeOption?.id;
                    const isCurrent = isSameEntity(option.selection, current);
                    return (
                      <button
                        key={option.id}
                        id={option.id}
                        type="button"
                        role="option"
                        tabIndex={-1}
                        aria-selected={isActive}
                        className="palette-item w-full flex items-center gap-3 px-3 py-2.5 text-left"
                        onClick={() => choose(option.selection)}
                        onMouseMove={() => {
                          if (!isActive) setActiveIndex(options.indexOf(option));
                        }}
                      >
                        <span className="palette-item-icon" aria-hidden>
                          <ModeIcon mode={option.selection.mode} />
                        </span>
                        <span className="text-base font-medium min-w-0 truncate">{option.selection.value}</span>
                        {group.key === 'favorites' && (
                          <span className="text-xs palette-item-hint">{MODE_LABEL[option.selection.mode]}</span>
                        )}
                        {isCurrent && (
                          <Check className="ml-auto size-4 flex-shrink-0" strokeWidth={2.5} aria-label="Aktuelle Auswahl" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-center px-6">
              <p className="text-base font-medium" style={{ color: 'var(--color-text)' }}>
                {query ? 'Keine Ergebnisse' : 'Noch nichts gefunden'}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {isLoadingMore
                  ? 'Ältere Pläne werden durchsucht…'
                  : query
                    ? 'Versuche einen anderen Suchbegriff.'
                    : 'Im aktuellen Plan stehen keine Klassen, Räume oder Lehrer.'}
              </p>
            </div>
          )}
          {isLoadingMore && options.length > 0 && (
            <p className="flex items-center justify-center gap-2 pb-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Ältere Pläne werden durchsucht…
            </p>
          )}
        </div>

        <div className="palette-footer">
          {[
            { key: '↑↓', label: 'Navigieren' },
            { key: '↵', label: 'Auswählen' },
            { key: 'ESC', label: 'Schließen' },
          ].map(hint => (
            <span key={hint.key} className="flex items-center gap-1.5">
              <kbd className="kbd">{hint.key}</kbd>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
