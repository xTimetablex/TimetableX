import { describe, expect, it } from 'vitest';
import { buildHistory, entityKey, getRecentSchoolDays } from '../history';
import { TimetableData } from '../types';

describe('getRecentSchoolDays', () => {
  it('returns weekdays only, newest first, including today', () => {
    // Monday 2026-11-16
    expect(getRecentSchoolDays(3, '20261116')).toEqual(['20261116', '20261113', '20261112']);
  });

  it('starts from the last weekday when today is a weekend', () => {
    expect(getRecentSchoolDays(1, '20261115')).toEqual(['20261113']);
  });
});

describe('buildHistory', () => {
  const day = (entries: TimetableData['entries'], classes: string[]): TimetableData => ({
    title: '',
    date: '',
    currentDateStr: '20261112',
    entries,
    availableClasses: classes,
    availableRooms: Array.from(new Set(entries.map(e => e.room).filter(v => v !== '---'))),
    availableTeachers: Array.from(new Set(entries.map(e => e.teacher).filter(v => v !== '---'))),
  });

  it('merges entities and collects subjects per entity', () => {
    const history = buildHistory([
      day([{ class: '5/1', hour: '1', subject: 'MA', teacher: 'KNO', room: '313', info: '---' }], ['5/1', '10/1']),
      day(
        [
          { class: '5/1', hour: '2', subject: 'DE', teacher: 'MEY', room: '311', info: '---' },
          { class: '10/1', hour: '3', subject: '---', teacher: '---', room: '---', info: 'fällt aus' },
        ],
        ['5/1']
      ),
    ]);

    expect(history.classes).toEqual(['5/1', '10/1']);
    expect(history.teachers).toEqual(['KNO', 'MEY']);
    expect(history.subjects[entityKey('class', '5/1')]).toEqual(['DE', 'MA']);
    expect(history.subjects[entityKey('teacher', 'KNO')]).toEqual(['MA']);
    expect(history.subjects[entityKey('room', '311')]).toEqual(['DE']);
    expect(history.subjects[entityKey('class', '10/1')]).toBeUndefined();
  });
});
