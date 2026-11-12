import { describe, expect, it } from 'vitest';
import { getChangedFields, isCancelledEntry } from '../lessonStatus';
import { TimetableEntry } from '../types';

const lesson = (overrides: Partial<TimetableEntry> = {}): TimetableEntry => ({
  class: '5/1',
  hour: '1',
  subject: 'MA',
  teacher: 'KNO',
  room: '313',
  info: '---',
  ...overrides,
});

describe('isCancelledEntry', () => {
  it.each([
    'Mathe entfällt',
    'Unterricht entfaellt',
    'Sport fällt aus',
    'faellt aus',
    'Ausfall',
    'Entfall wegen Exkursion',
  ])('detects "%s"', info => {
    expect(isCancelledEntry(lesson({ info }))).toBe(true);
  });

  it('detects a blanked, changed subject', () => {
    expect(isCancelledEntry(lesson({ subject: '---', subjectChanged: true }))).toBe(true);
  });

  it('does not flag regular lessons or substitutions', () => {
    expect(isCancelledEntry(lesson())).toBe(false);
    expect(isCancelledEntry(lesson({ info: 'Vertretung für Hr. Müller' }))).toBe(false);
    expect(isCancelledEntry(lesson({ subject: '---' }))).toBe(false);
  });
});

describe('getChangedFields', () => {
  it('only uses the XML change flags, not the info text', () => {
    // These texts used to trigger false "changed" highlights (r. / st. / statt).
    const entry = lesson({ info: 'Hr. Müller, selbst. Arbeiten, findet in Raum 204 statt' });
    expect(getChangedFields(entry)).toEqual({ hour: false, subject: false, teacher: false, room: false });
  });

  it('reports the flagged fields', () => {
    expect(getChangedFields(lesson({ roomChanged: true, teacherChanged: true }))).toEqual({
      hour: false,
      subject: false,
      teacher: true,
      room: true,
    });
  });
});
