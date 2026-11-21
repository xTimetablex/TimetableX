import { filterEntries } from './filterEntries';
import { FilterMode, Selection, TimetableData, TimetableEntry } from './types';

export function getAvailableValues(data: TimetableData | undefined, filterMode: FilterMode): string[] {
  if (!data) return [];
  if (filterMode === 'class') return data.availableClasses;
  if (filterMode === 'room') return data.availableRooms;
  return data.availableTeachers;
}

export function computeIsSelectionAvailable(
  data: TimetableData | undefined,
  filterMode: FilterMode,
  selectedValue: string
): boolean {
  if (!selectedValue || !data) return true;
  return getAvailableValues(data, filterMode).includes(selectedValue);
}

export type DayState =
  | { kind: 'weekend' }
  /** No plan published (404). `future` days may simply not be out yet. */
  | { kind: 'no-plan'; future: boolean }
  /** The plan exists, but the selected class/room/teacher isn't in it. */
  | { kind: 'not-in-plan' }
  /** The selection is in the plan but has no lessons. */
  | { kind: 'no-lessons' }
  /** Every lesson of the selection is hidden by the subject blacklist. */
  | { kind: 'all-hidden'; hiddenCount: number }
  | { kind: 'lessons'; entries: TimetableEntry[]; hiddenCount: number };

export function describeDay(
  day: TimetableData,
  selection: Selection,
  blacklist: string[],
  todayStr: string
): DayState {
  if (day.isWeekend) return { kind: 'weekend' };
  if (day.entries.length === 0) return { kind: 'no-plan', future: day.currentDateStr > todayStr };
  if (!computeIsSelectionAvailable(day, selection.mode, selection.value)) {
    return { kind: 'not-in-plan' };
  }

  const all = filterEntries(day.entries, selection.mode, selection.value, []);
  const visible = blacklist.length > 0
    ? filterEntries(day.entries, selection.mode, selection.value, blacklist)
    : all;
  const hiddenCount = all.length - visible.length;

  if (all.length === 0) return { kind: 'no-lessons' };
  if (visible.length === 0) return { kind: 'all-hidden', hiddenCount };
  return { kind: 'lessons', entries: visible, hiddenCount };
}

const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });

/** Natural sort, so `5/1` comes before `10/1`. */
export function sortNatural(values: Iterable<string>): string[] {
  return Array.from(values).sort(collator.compare);
}
