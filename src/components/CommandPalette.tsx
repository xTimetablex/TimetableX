'use client';

import React, { useState, useEffect, useEffectEvent, useRef, useMemo } from 'react';
import { Search, Users, MapPin, User, X } from 'lucide-react';
import { SearchItem } from '@/lib/types';
import { Button } from './button';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SearchItem) => void;
  items: SearchItem[];
}

const typeLabel: Record<SearchItem['type'], string> = {
  class: 'Klasse',
  room: 'Raum',
  teacher: 'Lehrer',
};

const typeLabelPlural: Record<SearchItem['type'], string> = {
  class: 'Klassen',
  room: 'Räume',
  teacher: 'Lehrer',
};

const TypeIcon = ({ type }: { type: SearchItem['type'] }) => {
  const props = { className: 'w-4 h-4', strokeWidth: 1.75 as number };
  if (type === 'class') return <Users {...props} />;
  if (type === 'room') return <MapPin {...props} />;
  return <User {...props} />;
};

export default function CommandPalette({ isOpen, onClose, onSelect, items }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      const id = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(item => item.name.toLowerCase().includes(q) || item.type.toLowerCase().includes(q))
      .sort((a, b) => {
        const an = a.name.toLowerCase();
        const bn = b.name.toLowerCase();
        if (an === q) return -1;
        if (bn === q) return 1;
        if (an.startsWith(q) && !bn.startsWith(q)) return -1;
        if (!an.startsWith(q) && bn.startsWith(q)) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 15);
  }, [items, search]);

  const onSelectEvent = useEffectEvent(onSelect);
  const onCloseEvent = useEffectEvent(onClose);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { onCloseEvent(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) { onSelectEvent(filteredItems[selectedIndex]); onCloseEvent(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  useEffect(() => {
    const el = document.getElementById(`palette-item-${selectedIndex}`);
    if (el && scrollRef.current) {
      const c = scrollRef.current;
      const top = el.offsetTop;
      const h = el.offsetHeight;
      if (top < c.scrollTop) c.scrollTop = top - 8;
      else if (top + h > c.scrollTop + c.offsetHeight) c.scrollTop = top + h - c.offsetHeight + 8;
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group items by type
  const groups: { type: SearchItem['type']; items: (SearchItem & { originalIndex: number })[] }[] = [];
  filteredItems.forEach((item, idx) => {
    const last = groups[groups.length - 1];
    if (!last || last.type !== item.type) {
      groups.push({ type: item.type, items: [{ ...item, originalIndex: idx }] });
    } else {
      last.items.push({ ...item, originalIndex: idx });
    }
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Suche"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 palette-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl overflow-hidden palette-panel"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Search
            className="size-5 flex-shrink-0"
            style={{ color: 'var(--color-primary)' }}
            strokeWidth={2}
          />
          <input
            ref={inputRef}
            type="search"
            placeholder="Klasse, Raum oder Lehrer suchen…"
            aria-label="Suche"
            className="flex-1 bg-transparent border-none outline-none palette-input"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <Button
            onClick={onClose}
            aria-label="Schließen"
            variant="icon"
            style={{ width: 44, height: 44 }}
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </Button>
        </div>

        {/* Results */}
        <div
          ref={scrollRef}
          className="overflow-y-auto"
          style={{ maxHeight: '52vh' }}
        >
          {filteredItems.length > 0 ? (
            <div className="p-2">
              {groups.map((group, groupIndex) => (
                <div key={`${group.type}-${groupIndex}`}>
                  {/* Group header */}
                  <div
                    className="flex items-center gap-2 px-3 pt-3 pb-1.5"
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {typeLabelPlural[group.type]}
                    </span>
                  </div>

                  {/* Group items */}
                  {group.items.map(item => {
                    const isSelected = item.originalIndex === selectedIndex;
                    return (
                      <Button
                        key={`${item.type}-${item.id}`}
                        id={`palette-item-${item.originalIndex}`}
                        role="option"
                        aria-selected={isSelected}
                        className="w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer text-left palette-item"
                        style={{ border: 'none', fontFamily: 'inherit' }}
                        onClick={() => { onSelect(item); onClose(); }}
                        onMouseEnter={() => setSelectedIndex(item.originalIndex)}
                      >
                        <div
                          className="flex items-center justify-center flex-shrink-0"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-sm)',
                            background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--color-primary-light)',
                            color: isSelected ? '#ffffff' : 'var(--color-primary)',
                          }}
                        >
                          <TypeIcon type={item.type} />
                        </div>
                        <span
                          className="text-base font-medium"
                          style={{ color: isSelected ? '#ffffff' : 'var(--color-text)' }}
                        >
                          {item.name}
                        </span>
                        {isSelected && (
                          <span
                            className="ml-auto text-xs font-medium px-2 py-0.5"
                            style={{
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(255,255,255,0.2)',
                              color: 'rgba(255,255,255,0.9)',
                            }}
                          >
                            ↵ Auswählen
                          </span>
                        )}
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
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--color-border-subtle)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Search className="size-5" strokeWidth={1.75} />
              </div>
              <div className="text-center">
                {search.trim().length === 0 ? (
                  <>
                    <p className="text-base font-medium" style={{ color: 'var(--color-text)' }}>
                      Suche starten
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      Tippe, um Klasse, Raum oder Lehrer zu finden.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-medium" style={{ color: 'var(--color-text)' }}>
                      Keine Ergebnisse
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      Versuche einen anderen Suchbegriff.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
          }}
        >
          <div className="flex items-center gap-4">
            {[
              { key: '↑↓', label: 'Navigieren' },
              { key: '↵', label: 'Auswählen' },
              { key: 'ESC', label: 'Schließen' },
            ].map(hint => (
              <div key={hint.key} className="flex items-center gap-1.5">
                <kbd
                  className="kbd"
                >
                  {hint.key}
                </kbd>
                <span className="text-xs hidden sm:inline" style={{ color: 'var(--color-text-muted)' }}>
                  {hint.label}
                </span>
              </div>
            ))}
          </div>
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--color-text-muted)' }}
          >
            TimetableX
          </span>
        </div>
      </div>
    </div>
  );
}
