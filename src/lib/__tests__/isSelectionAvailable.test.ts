import { describe, it, expect } from 'vitest';
import { computeIsSelectionAvailable } from '../dayState';
import { TimetableData } from '../types';

const makeDay = (classes: string[]): TimetableData => ({
  title: '',
  date: '20260609',
  currentDateStr: '20260609',
  entries: [],
  availableClasses: classes,
  availableRooms: [],
  availableTeachers: [],
});

describe('computeIsSelectionAvailable', () => {
  it('returns true when selectedValue is empty string', () => {
    expect(computeIsSelectionAvailable(makeDay(['5/1']), 'class', '')).toBe(true);
  });

  it('returns true when data is undefined', () => {
    expect(computeIsSelectionAvailable(undefined, 'class', '5/1')).toBe(true);
  });

  it('returns true when selectedValue is in availableClasses', () => {
    expect(computeIsSelectionAvailable(makeDay(['5/1', '9/2']), 'class', '5/1')).toBe(true);
  });

  it('returns false when selectedValue is NOT in availableClasses', () => {
    expect(computeIsSelectionAvailable(makeDay(['9/2']), 'class', '5/1')).toBe(false);
  });

  it('returns false when availableClasses is empty and selectedValue is set', () => {
    expect(computeIsSelectionAvailable(makeDay([]), 'class', '5/1')).toBe(false);
  });

  it('checks availableRooms when filterMode is room', () => {
    const day: TimetableData = { ...makeDay([]), availableRooms: ['313'], availableTeachers: [] };
    expect(computeIsSelectionAvailable(day, 'room', '313')).toBe(true);
    expect(computeIsSelectionAvailable(day, 'room', '999')).toBe(false);
  });

  it('checks availableTeachers when filterMode is teacher', () => {
    const day: TimetableData = { ...makeDay([]), availableRooms: [], availableTeachers: ['KNO'] };
    expect(computeIsSelectionAvailable(day, 'teacher', 'KNO')).toBe(true);
    expect(computeIsSelectionAvailable(day, 'teacher', 'ZZZ')).toBe(false);
  });
});
