import { describe, expect, it } from 'vitest';
import { buildIcsCalendar } from '../ics';
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
        { class: '10/1', hour: '1', subject: 'DE', teacher: 'MEY', room: '311', info: '---' },
      ],
      availableClasses: ['9/2', '10/1'],
      availableRooms: ['313', '311'],
      availableTeachers: ['KNO', 'MEY'],
    },
  ],
};

describe('buildIcsCalendar', () => {
  it('starts with the required VCALENDAR header and footer', () => {
    const ics = buildIcsCalendar(week, ['9/2']);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('includes one VEVENT per entry for the requested classes only', () => {
    const ics = buildIcsCalendar(week, ['9/2']);
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(2);
    expect(ics).not.toContain('SUMMARY:DE');
  });

  it('marks cancelled lessons with STATUS:CANCELLED and a prefix', () => {
    const ics = buildIcsCalendar(week, ['9/2']);
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics).toContain('SUMMARY:❌ SPO');
  });

  it('puts the room in LOCATION', () => {
    const ics = buildIcsCalendar(week, ['9/2']);
    expect(ics).toContain('LOCATION:313');
  });

  it('omits entries for hours with no known bell time', () => {
    const weekWithUnknownHour: TimetableWeekData = {
      ...week,
      days: [
        {
          ...week.days[0],
          entries: [{ class: '9/2', hour: '99', subject: 'MA', teacher: 'KNO', room: '313', info: '---' }],
        },
      ],
    };
    const ics = buildIcsCalendar(weekWithUnknownHour, ['9/2']);
    expect(ics.match(/BEGIN:VEVENT/g)).toBeNull();
  });
});
