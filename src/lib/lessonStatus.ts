import { TimetableEntry } from './types';

// Lower-case fragments that mark a lesson as cancelled. "entfäll"/"entfaell"
// catch "entfällt", which "entfall" alone does not match (ä ≠ a).
const CANCELLED_KEYWORDS = [
  'ausfall',
  'entfall',
  'entfäll',
  'entfaell',
  'fällt aus',
  'faellt aus',
  'fällt weg',
  'faellt weg',
  'cancel',
];

export function isCancelledEntry(entry: TimetableEntry): boolean {
  // Indiware blanks the subject of a cancelled lesson and flags it as changed.
  if (entry.subject === '---' && entry.subjectChanged) return true;

  const text = `${entry.subject} ${entry.info}`.toLowerCase();
  return CANCELLED_KEYWORDS.some(keyword => text.includes(keyword));
}

/**
 * Which fields of a lesson differ from the regular plan. These come only from
 * the XML's `*Ae` attributes: guessing from the free-text info (as this app
 * once did) flagged e.g. "Hr." as a room change and "selbst." as a time change.
 */
export function getChangedFields(entry: TimetableEntry) {
  return {
    hour: !!entry.hourChanged,
    subject: !!entry.subjectChanged,
    teacher: !!entry.teacherChanged,
    room: !!entry.roomChanged,
  };
}

export function hasInfo(entry: TimetableEntry): boolean {
  return !!entry.info && entry.info !== '---';
}
