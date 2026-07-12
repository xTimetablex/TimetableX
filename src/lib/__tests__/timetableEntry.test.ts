import { describe, expect, it } from 'vitest';
import { isCancelledEntry } from '../timetableEntry';
import { TimetableEntry } from '../types';

function entry(overrides: Partial<TimetableEntry>): TimetableEntry {
  return {
    class: '9/2',
    hour: '1',
    subject: 'MA',
    teacher: 'KNO',
    room: '313',
    info: '---',
    ...overrides,
  };
}

describe('isCancelledEntry', () => {
  it('detects "entfall" in the info text', () => {
    expect(isCancelledEntry(entry({ info: 'Sport Entfall' }))).toBe(true);
  });

  it('detects "fällt aus" in the info text', () => {
    expect(isCancelledEntry(entry({ info: 'Fach fällt aus' }))).toBe(true);
  });

  it('detects "ausfall" in the subject field', () => {
    expect(isCancelledEntry(entry({ subject: 'Ausfall' }))).toBe(true);
  });

  it('returns false for a normal entry', () => {
    expect(isCancelledEntry(entry({}))).toBe(false);
  });

  it('returns false for a room change without cancellation', () => {
    expect(isCancelledEntry(entry({ info: 'Raumänderung: Zimmer E204', roomChanged: true }))).toBe(false);
  });
});
