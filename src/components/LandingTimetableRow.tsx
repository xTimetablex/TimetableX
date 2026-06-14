import { MockTimetableEntry } from '@/lib/mockTimetableData';

export function LandingTimetableRow({
  entry,
  isLast,
}: {
  entry: MockTimetableEntry;
  isLast: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}
    >
      <span className="w-6 text-center text-sm font-bold" style={{ color: 'var(--color-text)' }}>
        {entry.hour}
      </span>
      <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {entry.subject}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {entry.teacher}
      </span>
      <span className="badge">{entry.room}</span>
    </div>
  );
}
