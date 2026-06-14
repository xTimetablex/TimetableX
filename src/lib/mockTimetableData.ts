export interface MockTimetableEntry {
  hour: string;
  subject: string;
  teacher: string;
  room: string;
}

export const MOCK_TIMETABLE_ENTRIES: MockTimetableEntry[] = [
  { hour: '1', subject: 'Mathematik', teacher: 'Hr. Müller', room: 'A12' },
  { hour: '2', subject: 'Englisch', teacher: 'Fr. Schmidt', room: 'B04' },
  { hour: '3', subject: 'Sport', teacher: 'Hr. Bauer', room: 'Halle 2' },
  { hour: '4', subject: 'Chemie', teacher: 'Fr. Weber', room: 'C21' },
];
