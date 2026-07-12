import { getBellTimes } from './bellSchedule';
import { isCancelledEntry } from './timetableEntry';
import { TimetableWeekData } from './types';

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function toIcsDateTime(dateStr: string, time: string): string {
  const [hh, mm] = time.split(':');
  return `${dateStr}T${hh}${mm}00`;
}

export function buildIcsCalendar(week: TimetableWeekData, classes: string[]): string {
  const classSet = new Set(classes);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TimetableX//Vertretungsplan//DE',
    'CALSCALE:GREGORIAN',
  ];

  for (const day of week.days) {
    for (const entry of day.entries) {
      if (!classSet.has(entry.class)) continue;

      const bellTimes = getBellTimes(entry.hour);
      if (!bellTimes) continue;

      const cancelled = isCancelledEntry(entry);
      const uid = `${day.currentDateStr}-${entry.class}-${entry.hour}@timetablex`;
      const summary = escapeIcsText(`${cancelled ? '❌ ' : ''}${entry.subject}`.trim());

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${toIcsDateTime(day.currentDateStr, bellTimes.start)}`,
        `DTEND:${toIcsDateTime(day.currentDateStr, bellTimes.end)}`,
        `SUMMARY:${summary}`,
        `LOCATION:${escapeIcsText(entry.room)}`,
        `DESCRIPTION:${escapeIcsText(entry.info)}`,
      );
      if (cancelled) lines.push('STATUS:CANCELLED');
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
