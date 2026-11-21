import { AlertCircle } from 'lucide-react';

/** The plan's general notes ("Unterrichtsschluss nach der 4. Stunde", …), shown above the lessons. */
export default function DayNotes({ notes, compact = false }: { notes?: string[]; compact?: boolean }) {
  if (!notes?.length) return null;

  return (
    <div className={`day-notes ${compact ? 'is-compact' : ''}`} role="note">
      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--color-warning)' }}>
        <AlertCircle className="size-4 flex-shrink-0" strokeWidth={2} aria-hidden />
        <span className="text-sm font-semibold">Hinweise</span>
      </div>
      <div className="space-y-1.5">
        {notes.map((note, index) => (
          <p
            key={`${index}-${note}`}
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-text)' }}
          >
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}
