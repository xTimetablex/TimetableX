import { describe, it, expect } from 'vitest';
import { filterEntries } from '../filterEntries';
import { TimetableEntry } from '../types';

const entries: TimetableEntry[] = [
  { class: '5/1', hour: '3', subject: 'MA', teacher: 'KNO', room: '313', info: '---' },
  { class: '5/1', hour: '1', subject: 'DE', teacher: 'MEY', room: '311', info: '---' },
  { class: '9/2', hour: '2', subject: 'EN', teacher: 'KNO', room: '204', info: '---' },
  { class: '10/1', hour: '4', subject: 'SPO', teacher: 'STZ', room: 'TH', info: '---' },
  { class: '5/1', hour: '2', subject: 'BIO', teacher: 'HIN', room: '101', info: '---' },
];

describe('filterEntries by class', () => {
  it('returns only matching class entries', () => {
    const result = filterEntries(entries, 'class', '5/1', []);
    expect(result.every(e => e.class === '5/1')).toBe(true);
    expect(result).toHaveLength(3);
  });

  it('sorts by hour ascending', () => {
    const result = filterEntries(entries, 'class', '5/1', []);
    expect(result.map(e => e.hour)).toEqual(['1', '2', '3']);
  });

  it('returns empty array when no value selected', () => {
    expect(filterEntries(entries, 'class', '', [])).toEqual([]);
  });
});

describe('filterEntries by teacher', () => {
  it('returns entries matching the teacher', () => {
    const result = filterEntries(entries, 'teacher', 'KNO', []);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.teacher === 'KNO')).toBe(true);
  });
});

describe('filterEntries by room', () => {
  it('returns entries matching the room', () => {
    const result = filterEntries(entries, 'room', '311', []);
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('DE');
  });
});

describe('filterEntries blacklist', () => {
  it('excludes blacklisted subjects', () => {
    const result = filterEntries(entries, 'class', '5/1', ['MA']);
    expect(result.some(e => e.subject === 'MA')).toBe(false);
    expect(result).toHaveLength(2);
  });

  it('excludes multiple blacklisted subjects', () => {
    const result = filterEntries(entries, 'class', '5/1', ['MA', 'DE']);
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('BIO');
  });

  it('returns all entries when blacklist is empty', () => {
    const result = filterEntries(entries, 'class', '5/1', []);
    expect(result).toHaveLength(3);
  });
});

describe('filterEntries edge cases', () => {
  it('returns empty array when entries is empty', () => {
    expect(filterEntries([], 'class', '5/1', [])).toEqual([]);
  });

  it('returns empty array when all matching entries are blacklisted', () => {
    const result = filterEntries(entries, 'class', '5/1', ['MA', 'DE', 'BIO']);
    expect(result).toEqual([]);
  });

  it('non-numeric hours sort to key 0 via the || 0 fallback', () => {
    const mixed: TimetableEntry[] = [
      { class: 'X', hour: '3', subject: 'MA', teacher: 'A', room: '1', info: '' },
      { class: 'X', hour: 'AG', subject: 'EN', teacher: 'A', room: '1', info: '' },
      { class: 'X', hour: '1', subject: 'DE', teacher: 'A', room: '1', info: '' },
    ];
    const result = filterEntries(mixed, 'class', 'X', []);
    // 'AG' -> parseInt('AG') = NaN -> NaN || 0 = 0, sorts before '1'
    expect(result[0].subject).toBe('EN');
    expect(result[1].subject).toBe('DE');
    expect(result[2].subject).toBe('MA');
  });

  it('hour "0" is treated same as non-numeric (|| 0 known limitation)', () => {
    const withZero: TimetableEntry[] = [
      { class: 'X', hour: '0', subject: 'ZERO', teacher: 'A', room: '1', info: '' },
      { class: 'X', hour: 'AG', subject: 'AG', teacher: 'A', room: '1', info: '' },
      { class: 'X', hour: '1', subject: 'ONE', teacher: 'A', room: '1', info: '' },
    ];
    const result = filterEntries(withZero, 'class', 'X', []);
    // Both '0' and 'AG' map to sort key 0, 'ONE' sorts after
    const sortKeys = result.map(e => parseInt(e.hour) || 0);
    expect(sortKeys[sortKeys.length - 1]).toBe(1);
  });
});
