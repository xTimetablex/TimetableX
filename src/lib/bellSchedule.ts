// ponytail: the source XML carries only an hour number (no clock time),
// so a fixed default schedule is the sole time source. Upgrade to a
// per-school configurable schedule if a school with a different bell
// schedule needs this feature.
const DEFAULT_BELL_SCHEDULE: Record<string, { start: string; end: string }> = {
  '1': { start: '07:45', end: '08:30' },
  '2': { start: '08:35', end: '09:20' },
  '3': { start: '09:40', end: '10:25' },
  '4': { start: '10:30', end: '11:15' },
  '5': { start: '11:35', end: '12:20' },
  '6': { start: '12:35', end: '13:20' },
  '7': { start: '13:25', end: '14:10' },
  '8': { start: '14:15', end: '15:00' },
};

export function getBellTimes(hour: string): { start: string; end: string } | null {
  return DEFAULT_BELL_SCHEDULE[hour] ?? null;
}
