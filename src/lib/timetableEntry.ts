import { TimetableEntry } from './types';

export function isCancelledEntry(entry: TimetableEntry): boolean {
  const combinedText = `${entry.subject} ${entry.info} ${entry.teacher} ${entry.room}`.toLowerCase();
  return ['ausfall', 'entfall', 'fällt aus', 'faellt aus', 'cancel'].some(keyword =>
    combinedText.includes(keyword)
  );
}
