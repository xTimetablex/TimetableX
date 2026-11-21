import { describe, expect, it } from 'vitest';
import { describeDay, sortNatural } from '../dayState';
import { TimetableData, TimetableEntry } from '../types';

const entry = (overrides: Partial<TimetableEntry>): TimetableEntry => ({
  class: '5/1',
  hour: '1',
  subject: 'MA',
  teacher: 'KNO',
  room: '313',
  info: '---',
  ...overrides,
});

const day = (overrides: Partial<TimetableData> = {}): TimetableData => ({
  title: 'Stundenplan',
  date: 'Donnerstag, 12. November 2026',
  currentDateStr: '20261112',
  entries: [entry({ hour: '2', subject: 'DE' }), entry({ hour: '1', subject: 'REL' })],
  availableClasses: ['5/1', '6/2'],
  availableRooms: ['313'],
  availableTeachers: ['KNO'],
  ...overrides,
});

const TODAY = '20261112';
const class51 = { mode: 'class' as const, value: '5/1' };

describe('describeDay', () => {
  it('reports weekends', () => {
    expect(describeDay(day({ isWeekend: true, entries: [] }), class51, [], TODAY)).toEqual({ kind: 'weekend' });
  });

  it('reports a missing plan and whether it may still come', () => {
    const empty = { entries: [], availableClasses: [] };
    expect(describeDay(day({ ...empty, currentDateStr: '20261113' }), class51, [], TODAY)).toEqual({
      kind: 'no-plan',
      future: true,
    });
    expect(describeDay(day({ ...empty, currentDateStr: '20261111' }), class51, [], TODAY)).toEqual({
      kind: 'no-plan',
      future: false,
    });
  });

  it('keeps a selection that is not in the plan instead of replacing it', () => {
    const teacher = { mode: 'teacher' as const, value: 'ZZZ' };
    expect(describeDay(day(), teacher, [], TODAY)).toEqual({ kind: 'not-in-plan' });
  });

  it('distinguishes "no lessons" from "everything hidden"', () => {
    expect(describeDay(day(), { mode: 'class', value: '6/2' }, [], TODAY)).toEqual({ kind: 'no-lessons' });
    expect(describeDay(day(), class51, ['DE', 'REL'], TODAY)).toEqual({ kind: 'all-hidden', hiddenCount: 2 });
  });

  it('returns sorted, filtered lessons and how many were hidden', () => {
    const state = describeDay(day(), class51, ['REL'], TODAY);
    expect(state.kind).toBe('lessons');
    if (state.kind !== 'lessons') return;
    expect(state.entries.map(e => e.subject)).toEqual(['DE']);
    expect(state.hiddenCount).toBe(1);
  });
});

describe('sortNatural', () => {
  it('sorts class names numerically', () => {
    expect(sortNatural(['10/1', '5/1', '9/2', '5/2'])).toEqual(['5/1', '5/2', '9/2', '10/1']);
  });
});
