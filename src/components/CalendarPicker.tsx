'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Users, User, X, Check, Plus } from 'lucide-react';
import { CalendarEntityType } from '@/lib/types';
import { Button } from './button';

export interface PickerItem {
  type: CalendarEntityType;
  value: string;
}

interface CalendarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  items: PickerItem[];
  activeKeys: Set<string>;
  isBusy: boolean;
  onAdd: (type: CalendarEntityType, value: string) => void;
}

const typeLabelPlural: Record<CalendarEntityType, string> = {
  class: 'Klassen',
  teacher: 'Lehrer',
};

export function feedKey(type: CalendarEntityType, value: string): string {
  return `${type}:${value}`;
}

export default function CalendarPicker({
  isOpen,
  onClose,
  items,
  activeKeys,
  isBusy,
  onAdd,
}: CalendarPickerProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    inputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = query
      ? items.filter(item => item.value.toLowerCase().includes(query))
      : items;
    return (['class', 'teacher'] as const)
      .map(type => ({ type, entries: matched.filter(item => item.type === type) }))
      .filter(group => group.entries.length > 0);
  }, [items, search]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Kalender aktivieren"
    >
      <div className="fixed inset-0 palette-backdrop" onClick={onClose} aria-hidden="true" />

      <div
        className="relative w-full max-w-xl overflow-hidden palette-panel"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <Search className="size-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
          <input
            ref={inputRef}
            type="search"
            placeholder="Klasse oder Lehrer suchen…"
            aria-label="Klasse oder Lehrer suchen"
            className="flex-1 bg-transparent border-none outline-none palette-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button onClick={onClose} aria-label="Schließen" variant="icon" style={{ width: 44, height: 44 }}>
            <X className="size-3.5" strokeWidth={2.5} />
          </Button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: '52vh' }}>
          {groups.length > 0 ? (
            <div className="p-2">
              {groups.map(group => (
                <div key={group.type}>
                  <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {typeLabelPlural[group.type]}
                    </span>
                  </div>

                  {group.entries.map(item => {
                    const isActive = activeKeys.has(feedKey(item.type, item.value));
                    return (
                      <Button
                        key={feedKey(item.type, item.value)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer text-left palette-item"
                        style={{ border: 'none', fontFamily: 'inherit' }}
                        disabled={isBusy || isActive}
                        onClick={() => onAdd(item.type, item.value)}
                      >
                        <div
                          className="flex items-center justify-center flex-shrink-0"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--color-primary-light)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {group.type === 'class' ? (
                            <Users className="w-4 h-4" strokeWidth={1.75} />
                          ) : (
                            <User className="w-4 h-4" strokeWidth={1.75} />
                          )}
                        </div>
                        <span className="text-base font-medium" style={{ color: 'var(--color-text)' }}>
                          {item.value}
                        </span>
                        <span className="ml-auto flex items-center gap-1 text-xs font-medium" style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                          {isActive ? (
                            <>
                              <Check className="size-3.5" strokeWidth={2.5} /> Aktiv
                            </>
                          ) : (
                            <>
                              <Plus className="size-3.5" strokeWidth={2.5} /> Hinzufügen
                            </>
                          )}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="flex items-center justify-center"
                style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
              >
                <Search className="size-5" strokeWidth={1.75} />
              </div>
              <p className="text-base font-medium" style={{ color: 'var(--color-text)' }}>
                Keine Ergebnisse
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
