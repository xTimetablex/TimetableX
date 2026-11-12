'use client';

import { Search } from 'lucide-react';
import { Selection } from '@/lib/types';
import { Button } from './button';

/** First run: no class/room/teacher chosen yet. Classes are one tap away. */
export default function SelectionPrompt({
  classes,
  isLoading,
  onSelect,
  onOpenPicker,
}: {
  classes: string[];
  isLoading: boolean;
  onSelect: (selection: Selection) => void;
  onOpenPicker: () => void;
}) {
  return (
    <section className="day-container">
      <div className="panel-muted p-5 sm:p-6">
        <h2 className="display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
          Welchen Plan möchtest du sehen?
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Tippe auf deine Klasse. Räume und Lehrkräfte findest du über die Suche. Deine Auswahl
          bleibt auf diesem Gerät gespeichert.
        </p>

        {classes.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2" role="list" aria-label="Klassen">
            {classes.map(value => (
              <Button
                key={value}
                role="listitem"
                variant="chip"
                onClick={() => onSelect({ mode: 'class', value })}
              >
                {value}
              </Button>
            ))}
          </div>
        ) : isLoading ? (
          <div className="mt-5 flex flex-wrap gap-2" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="skeleton skeleton-pill" style={{ width: 56, height: 36, animationDelay: `${i * 0.05}s` }} />
            ))}
          </div>
        ) : null}

        <Button onClick={onOpenPicker} variant="outline" className="mt-6 w-full text-sm" style={{ height: 48 }}>
          <Search className="size-4" strokeWidth={2} />
          Klasse, Raum oder Lehrer suchen
        </Button>
      </div>
    </section>
  );
}
