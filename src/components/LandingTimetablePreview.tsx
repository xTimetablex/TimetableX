import { MOCK_TIMETABLE_ENTRIES } from '@/lib/mockTimetableData';
import { LandingTimetableHeader } from './LandingTimetableHeader';
import { LandingTimetableRow } from './LandingTimetableRow';

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
