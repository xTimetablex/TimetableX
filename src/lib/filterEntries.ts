import { FilterMode, TimetableEntry } from '@/lib/types';

export function filterEntries(
  entries: TimetableEntry[],
  filterMode: FilterMode,
  selectedValue: string,
  blacklist: string[]
): TimetableEntry[] {
  if (!selectedValue) return [];
  const hidden = new Set(blacklist);

  const filtered = entries.filter(e => {
    let isMatch = false;
    if (filterMode === 'class') isMatch = e.class === selectedValue;
    else if (filterMode === 'room') isMatch = e.room === selectedValue;
    else if (filterMode === 'teacher') isMatch = e.teacher === selectedValue;

    if (!isMatch) return false;
    if (hidden.has(e.subject)) return false;
    return true;
  });

  return filtered.toSorted((a, b) => (parseInt(a.hour) || 0) - (parseInt(b.hour) || 0));
}
