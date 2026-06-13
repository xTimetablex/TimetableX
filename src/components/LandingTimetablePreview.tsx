import { CheckCircle2 } from 'lucide-react';

export interface MockTimetableEntry {
  hour: string;
  subject: string;
  teacher: string;
  room: string;
}

export const MOCK_TIMETABLE_ENTRIES: MockTimetableEntry[] = [
  { hour: '1', subject: 'Mathematik', teacher: 'Hr. Müller', room: 'A12' },
  { hour: '2', subject: 'Englisch', teacher: 'Fr. Schmidt', room: 'B04' },
  { hour: '3', subject: 'Sport', teacher: 'Hr. Bauer', room: 'Halle 2' },
  { hour: '4', subject: 'Chemie', teacher: 'Fr. Weber', room: 'C21' },
];

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

export default function LandingTimetablePreview({ rowCount = 2 }: { rowCount?: number }) {
  const rows = MOCK_TIMETABLE_ENTRIES.slice(0, rowCount);
  return (
    <div className="panel overflow-hidden">
      <LandingTimetableHeader />
      <div>
        {rows.map((entry, i) => (
          <LandingTimetableRow key={entry.hour} entry={entry} isLast={i === rows.length - 1} />
        ))}
      </div>
    </div>
  );
}
