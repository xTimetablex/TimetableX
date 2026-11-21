/*
 * What the picker and the "Fächer ausblenden" dialog list: the loaded plans
 * merged with the recent history. Pure and server-safe.
 */
import { getAvailableValues, sortNatural } from './dayState';
import { entityKey, TimetableHistory } from './history';
import { FilterMode, SearchItem, Selection, TimetableData } from './types';

type Plans = ReadonlyArray<TimetableData | undefined>;

const HISTORY_FIELD = { class: 'classes', room: 'rooms', teacher: 'teachers' } as const;
const MODES: FilterMode[] = ['class', 'room', 'teacher'];

/** Every known class, room and teacher, in that order, each sorted naturally. */
export function buildSearchItems(plans: Plans, history: TimetableHistory | undefined): SearchItem[] {
  return MODES.flatMap(mode => {
    const values = new Set(history?.[HISTORY_FIELD[mode]] ?? []);
    plans.forEach(plan => getAvailableValues(plan, mode).forEach(value => values.add(value)));
    return sortNatural(values).map(name => ({ id: `${mode}:${name}`, name, type: mode }));
  });
}

function matchesSelection(entry: TimetableData['entries'][number], selection: Selection): boolean {
  return entry[selection.mode] === selection.value;
}

/**
 * Subjects the selection had recently or has in the loaded plans, plus the
 * ones already hidden (so they can always be shown again).
 */
export function collectSubjects(
  selection: Selection | null | undefined,
  plans: Plans,
  history: TimetableHistory | undefined,
  hidden: string[]
): string[] {
  if (!selection) return [];
  const subjects = new Set(history?.subjects[entityKey(selection.mode, selection.value)] ?? []);
  plans.forEach(plan =>
    plan?.entries.forEach(entry => {
      if (matchesSelection(entry, selection) && entry.subject && entry.subject !== '---') {
        subjects.add(entry.subject);
      }
    })
  );
  hidden.forEach(subject => subjects.add(subject));
  return sortNatural(subjects);
}
