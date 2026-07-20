import { getBellTimes } from './bellSchedule';
import { isCancelledEntry } from './timetableEntry';
import { CalendarEntityType, TimetableEntry, TimetableWeekData } from './types';

export interface CalendarEntity {
  type: CalendarEntityType;
  value: string;
}

const FALLBACK_VALUE = '---';

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function toIcsDateTime(dateStr: string, time: string): string {
  const [hh, mm] = time.split(':');
  return `${dateStr}T${hh}${mm}00`;
}

function buildSummary(entry: TimetableEntry, entity: CalendarEntity, cancelled: boolean): string {
  const prefix = cancelled ? '❌ ' : '';
  // Teacher feeds show the class so the teacher can tell lessons apart; class feeds don't need it.
  const suffix =
    entity.type === 'teacher' && entry.class && entry.class !== FALLBACK_VALUE
      ? ` · ${entry.class}`
      : '';
  return `${prefix}${entry.subject}${suffix}`.trim();
}

export function buildIcsCalendar(week: TimetableWeekData, entity: CalendarEntity): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TimetableX//Vertretungsplan//DE',
    'CALSCALE:GREGORIAN',
  ];

  for (const day of week.days) {
    for (const entry of day.entries) {
      const matches =
        entity.type === 'class' ? entry.class === entity.value : entry.teacher === entity.value;
      if (!matches) continue;

      const bellTimes = getBellTimes(entry.hour);
      if (!bellTimes) continue;

      const cancelled = isCancelledEntry(entry);
      const uid = `${day.currentDateStr}-${entity.type}-${entry.class}-${entry.teacher}-${entry.hour}@timetablex`;

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${toIcsDateTime(day.currentDateStr, bellTimes.start)}`,
        `DTEND:${toIcsDateTime(day.currentDateStr, bellTimes.end)}`,
        `SUMMARY:${escapeIcsText(buildSummary(entry, entity, cancelled))}`,
        `LOCATION:${escapeIcsText(entry.room)}`,
        `DESCRIPTION:${escapeIcsText(entry.info)}`
      );
      if (cancelled) lines.push('STATUS:CANCELLED');
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
