import { describe, expect, it } from 'vitest';
import { computeNotifications } from '../server/notifyDiff';
import { TimetableWeekData } from '../types';

const week: TimetableWeekData = {
  title: 'Stundenplan',
  date: 'Woche vom 1.6 - 5.6',
  currentDateStr: '20260601',
  weekStartStr: '20260601',
  availableClasses: ['9/2'],
  availableRooms: ['313'],
  availableTeachers: ['KNO'],
  days: [
    {
      title: 'Stundenplan',
      date: 'Montag, 1. Juni 2026',
      currentDateStr: '20260601',
      entries: [
        { class: '9/2', hour: '1', subject: 'MA', teacher: 'KNO', room: '313', info: '---' },
        { class: '9/2', hour: '2', subject: 'SPO', teacher: '---', room: '---', info: 'Sport fällt aus' },
        { class: '9/2', hour: '3', subject: 'EN', teacher: 'STZ', room: 'E204', info: 'Raumänderung', roomChanged: true },
        { class: '10/1', hour: '1', subject: 'DE', teacher: 'MEY', room: '311', info: 'fällt aus' },
      ],
      availableClasses: ['9/2', '10/1'],
      availableRooms: ['313', '311', 'E204'],
      availableTeachers: ['KNO', 'MEY', 'STZ'],
    },
  ],
};

describe('computeNotifications', () => {
  it('produces a notification for a cancelled lesson', () => {
    const notifications = computeNotifications(week, ['9/2'], []);
    expect(notifications.some(n => n.key.includes('cancelled') && n.body.includes('SPO'))).toBe(true);
  });

  it('produces a notification for a room change', () => {
    const notifications = computeNotifications(week, ['9/2'], []);
    expect(notifications.some(n => n.key.includes('room') && n.body.includes('EN'))).toBe(true);
  });

  it('does not flag a normal, unchanged lesson', () => {
    const notifications = computeNotifications(week, ['9/2'], []);
    expect(notifications.some(n => n.body.includes('MA'))).toBe(false);
  });

  it('only considers the requested classes', () => {
    const notifications = computeNotifications(week, ['9/2'], []);
    expect(notifications.some(n => n.body.includes('DE'))).toBe(false);
  });

  it('excludes keys already in the seen list', () => {
    const first = computeNotifications(week, ['9/2'], []);
    const seenKeys = first.map(n => n.key);
    const second = computeNotifications(week, ['9/2'], seenKeys);
    expect(second).toHaveLength(0);
  });
});
