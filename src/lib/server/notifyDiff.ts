import { isCancelledEntry } from '../timetableEntry';
import { TimetableWeekData } from '../types';

export interface PlanNotification {
  key: string;
  title: string;
  body: string;
}

export function computeNotifications(
  week: TimetableWeekData,
  classes: string[],
  seen: string[]
): PlanNotification[] {
  const classSet = new Set(classes);
  const seenSet = new Set(seen);
  const notifications: PlanNotification[] = [];

  for (const day of week.days) {
    for (const entry of day.entries) {
      if (!classSet.has(entry.class)) continue;

      if (isCancelledEntry(entry)) {
        const key = `${day.currentDateStr}|${entry.class}|${entry.hour}|cancelled`;
        if (!seenSet.has(key)) {
          notifications.push({
            key,
            title: `${entry.class}: Stunde ${entry.hour} fällt aus`,
            body: `${entry.subject} fällt aus (${day.date}).`,
          });
        }
      } else if (entry.roomChanged) {
        const key = `${day.currentDateStr}|${entry.class}|${entry.hour}|room`;
        if (!seenSet.has(key)) {
          notifications.push({
            key,
            title: `${entry.class}: Raumänderung`,
            body: `${entry.subject} jetzt in Raum ${entry.room} (${day.date}).`,
          });
        }
      }
    }
  }

  return notifications;
}
