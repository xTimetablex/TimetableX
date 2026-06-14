import { CheckCircle2 } from 'lucide-react';

export function LandingTimetableHeader() {
  return (
    <div
      className="flex items-center gap-2 px-4 py-3"
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
    >
      <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        Montag, 15.06.
      </span>
    </div>
  );
}
