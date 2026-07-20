export type FilterMode = 'class' | 'room' | 'teacher';
export type ViewMode = 'day' | 'week';

export type CalendarEntityType = 'class' | 'teacher';

export interface TimetableEntry {
  class: string;
  hour: string;
  subject: string;
  teacher: string;
  room: string;
  info: string;
  roomChanged?: boolean;
  teacherChanged?: boolean;
  subjectChanged?: boolean;
  hourChanged?: boolean;
}

export interface TimetableData {
  title: string;
  date: string;
  entries: TimetableEntry[];
  availableClasses: string[];
  availableRooms: string[];
  availableTeachers: string[];
  currentDateStr: string;
  dayNotes?: string[];
  isWeekend?: boolean;
}

export type TimetableDayData = TimetableData;

export interface TimetableWeekData {
  title: string;
  date: string;
  currentDateStr: string;
  weekStartStr: string;
  days: TimetableDayData[];
  availableClasses: string[];
  availableRooms: string[];
  availableTeachers: string[];
}

export type TimetableResponse = TimetableData | TimetableWeekData;

export interface Favorite {
  mode: FilterMode;
  value: string;
}

export interface Credentials {
  school: string;
  user: string;
  pass: string;
}

export type AuthIdentity = Pick<Credentials, 'school' | 'user'>;

export interface SearchItem {
  id: string;
  name: string;
  type: FilterMode;
}
