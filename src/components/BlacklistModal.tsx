'use client';

import { useMemo } from 'react';
import { Check, EyeOff, X } from 'lucide-react';
import { useCloseOnBack } from '@/lib/hooks/useCloseOnBack';
import { Button } from './button';
import { ModalDialog } from './ModalDialog';

interface BlacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityLabel: string;
  /** Subjects this class/room/teacher had recently. */
  subjects: string[];
  hidden: string[];
  isLoading: boolean;
  onToggle: (subject: string) => void;
}

export default function BlacklistModal(props: BlacklistModalProps) {
  useCloseOnBack(props.isOpen, props.onClose);
  if (!props.isOpen) return null;
  return <BlacklistDialog {...props} />;
}

function BlacklistDialog({ onClose, entityLabel, subjects, hidden, isLoading, onToggle }: BlacklistModalProps) {
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  return (
    <ModalDialog onClose={onClose} aria-labelledby="blacklist-title">
      <div className="relative w-full max-w-md overflow-hidden palette-panel flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 min-w-0" style={{ color: 'var(--color-text)' }}>
            <EyeOff className="size-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden />
            <h2 id="blacklist-title" className="font-semibold text-base truncate">
              Fächer ausblenden · {entityLabel}
            </h2>
          </div>
          <Button onClick={onClose} aria-label="Schließen" variant="icon" style={{ width: 40, height: 40 }}>
            <X className="size-4" strokeWidth={2} />
          </Button>
        </div>

        <p className="px-5 py-3 text-sm border-b" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg)' }}>
          Ausgeblendete Fächer erscheinen nicht mehr im Plan. Zur Auswahl stehen die Fächer der
          letzten zwei Schulwochen.
        </p>

        <div className="flex-1 overflow-y-auto overscroll-contain min-h-[200px] max-h-[50vh] p-3 space-y-1.5" style={{ background: 'var(--color-bg)' }}>
          {subjects.length === 0 && isLoading ? (
            <div className="space-y-1.5" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}
                >
                  <div className="skeleton" style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, animationDelay: `${i * 0.06}s` }} />
                  <div className="skeleton" style={{ width: `${55 + (i % 3) * 12}%`, height: 14, animationDelay: `${i * 0.06}s` }} />
                </div>
              ))}
              <output className="sr-only">Fächer der letzten zwei Schulwochen werden geladen…</output>
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <EyeOff className="size-8 opacity-20 mb-3" style={{ color: 'var(--color-text-muted)' }} aria-hidden />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Keine Fächer gefunden</p>
              <p className="text-xs mt-1 max-w-[240px]" style={{ color: 'var(--color-text-muted)' }}>
                In den letzten zwei Schulwochen stand für {entityLabel} kein Fach im Plan.
              </p>
            </div>
          ) : (
            subjects.map(subject => {
              const isHidden = hiddenSet.has(subject);
              return (
                <Button
                  key={subject}
                  onClick={() => onToggle(subject)}
                  aria-pressed={isHidden}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition active:scale-[0.98]"
                  style={{
                    background: isHidden ? 'var(--color-danger-bg)' : 'var(--color-surface)',
                    border: isHidden ? '1px solid var(--color-danger-border)' : '1px solid var(--color-border-subtle)',
                  }}
                >
                  <span
                    className="size-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      border: isHidden ? 'none' : '1px solid var(--color-text-muted)',
                      background: isHidden ? 'var(--color-danger)' : 'transparent',
                    }}
                    aria-hidden
                  >
                    {isHidden && <Check className="size-3.5" style={{ color: 'white' }} strokeWidth={3} />}
                  </span>
                  <span
                    className="text-sm font-medium truncate"
                    style={{
                      color: isHidden ? 'var(--color-danger)' : 'var(--color-text)',
                      textDecoration: isHidden ? 'line-through' : 'none',
                    }}
                  >
                    {subject}
                  </span>
                </Button>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
          <Button onClick={onClose} variant="primary" className="text-sm" style={{ padding: '0.6rem 1.4rem' }}>
            Fertig
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
