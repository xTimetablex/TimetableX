import { parseStringPromise } from 'xml2js';
import { formatDateStr, formatDayLabel, formatWeekLabel, getWeekDates, parseDateStr } from './date';
import { TimetableData, TimetableDayData, TimetableEntry, TimetableWeekData } from './types';

const FALLBACK_VALUE = '---';

function getFallbackDate(dateStr: string): string {
  return formatDayLabel(parseDateStr(dateStr));
}

function cleanValue(val: any): string {
  const actualVal = typeof val === 'string' ? val : (val?._ || '');
  if (!actualVal || actualVal === '&nbsp;' || actualVal.trim() === '' || actualVal === FALLBACK_VALUE) {
    return FALLBACK_VALUE;
  }
  return actualVal.trim();
}

/**
 * Checks if a value object from xml2js has an "Ae" (Aenderung/Change) attribute.
 * E.g. std.Ra[0].$.RaAe === 'RaGeaendert'
 */
function hasChangeFlag(val: any, attrName: string): boolean {
  if (typeof val === 'object' && val?.$ && val?.$[attrName]) {
    return true;
  }
  return false;
}

const SAMPLE_DATA: TimetableData = {
  title: 'Beispiel Stundenplan',
  date: 'Montag, 30. März 2026 (Beispieldaten)',
  entries: [
    {
      class: '5/1',
      hour: '1',
      subject: 'MA',
      teacher: 'KNO',
      room: '313',
      info: '---'
    },
    {
      class: '5/1',
      hour: '2',
      subject: 'DE',
      teacher: 'MEY',
      room: '311',
      info: 'Vertretung für AUE',
      teacherChanged: true
    },
    {
      class: '5/1',
      hour: '3',
      subject: 'EN',
      teacher: 'STZ',
      room: 'E204',
      info: 'Raumänderung: Zimmer E204',
      roomChanged: true
    },
    {
      class: '9/2',
      hour: '4',
      subject: 'CH',
      teacher: 'HIN',
      room: '328',
      info: 'Klassenänderung: Kurs 9/2+9/3'
    },
    {
      class: '10/1',
      hour: '5',
      subject: 'SPO',
      teacher: '---',
      room: '---',
      info: 'Sport fällt aus'
    }
  ],
  availableClasses: ['5/1', '9/2', '10/1'],
  availableRooms: ['313', '311', 'E204', '328'],
  availableTeachers: ['KNO', 'MEY', 'STZ', 'HIN'],
  currentDateStr: '20260330'
};

async function fetchDayTimetable(
  school: string,
  user: string,
  pass: string,
  dateStr?: string
): Promise<TimetableData> {
  if (school === 'sample' || school === 'demo') {
    return SAMPLE_DATA;
  }

  let targetDateStr = dateStr;
  if (!targetDateStr) {
    targetDateStr = formatDateStr(new Date());
  }
  
  const url = `https://www.stundenplan24.de/${school}/wplan/wdatenk/WPlanKl_${targetDateStr}.xml`;
  const credentials = Buffer.from(`${user}:${pass}`).toString('base64');

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Basic ${credentials}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Ungültiger Benutzername oder Passwort.');
      }
      
      const y = parseInt(targetDateStr.slice(0, 4));
      const m = parseInt(targetDateStr.slice(4, 6)) - 1;
      const d = parseInt(targetDateStr.slice(6, 8));
      const dayOfWeek = new Date(y, m, d).getDay(); // 0 = Sunday, 6 = Saturday
      
      return {
        title: 'Stundenplan',
        date: getFallbackDate(targetDateStr),
        entries: [],
        availableClasses: [],
        availableRooms: [],
        availableTeachers: [],
        currentDateStr: targetDateStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      };
    }

    const xml = await response.text();
    const result = await parseStringPromise(xml);

    const kopf = result.WplanVp?.Kopf?.[0] || {};
    const datum = kopf.DatumPlan?.[0] || 'Unbekanntes Datum';
    const zeitstempel = kopf.zeitstempel?.[0] || '';

    const dayNotes: string[] = [];
    
    // Extract notes from ZusatzInfo and FreieTexte
    const zusatzInfoLines = result.WplanVp?.ZusatzInfo?.[0]?.ZiZeile || [];
    const freieTexte = result.WplanVp?.FreieTexte?.[0]?.Ft || [];

    [...zusatzInfoLines, ...freieTexte].forEach(line => {
      const text = cleanValue(line);
      if (text !== FALLBACK_VALUE && !dayNotes.includes(text)) {
        dayNotes.push(text);
      }
    });

    const entries: TimetableEntry[] = [];
    const classSet = new Set<string>();
    const roomSet = new Set<string>();
    const teacherSet = new Set<string>();

    const klassen = result.WplanVp?.Klassen?.[0]?.Kl || [];

    for (const kl of klassen) {
      const className = cleanValue(kl.Kurz?.[0]);
      if (className !== FALLBACK_VALUE) classSet.add(className);
      
      const stunden = kl.Pl?.[0]?.Std || [];

      for (const std of stunden) {
        const entry: TimetableEntry = {
          class: className,
          hour: cleanValue(std.St?.[0]),
          subject: cleanValue(std.Fa?.[0]),
          teacher: cleanValue(std.Le?.[0]),
          room: cleanValue(std.Ra?.[0]),
          info: cleanValue(std.If?.[0]),
          // Flags from XML attributes
          hourChanged: hasChangeFlag(std.St?.[0], 'StAe'),
          subjectChanged: hasChangeFlag(std.Fa?.[0], 'FaAe'),
          teacherChanged: hasChangeFlag(std.Le?.[0], 'LeAe'),
          roomChanged: hasChangeFlag(std.Ra?.[0], 'RaAe'),
        };
        
        entries.push(entry);
        if (entry.room !== FALLBACK_VALUE) roomSet.add(entry.room);
        if (entry.teacher !== FALLBACK_VALUE) teacherSet.add(entry.teacher);
      }
    }

    return {
      title: 'Stundenplan',
      date: `${datum} (Aktualisiert: ${zeitstempel})`,
      entries,
      availableClasses: Array.from(classSet).sort(),
      availableRooms: Array.from(roomSet).sort(),
      availableTeachers: Array.from(teacherSet).sort(),
      currentDateStr: targetDateStr,
      dayNotes: dayNotes.length > 0 ? dayNotes : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('fetch')) {
      throw new Error('Verbindung zum Server fehlgeschlagen.');
    }
    throw error;
  }
}

export async function fetchStundenplan(
  school: string,
  user: string,
  pass: string,
  dateStr?: string
): Promise<TimetableData> {
  return fetchDayTimetable(school, user, pass, dateStr);
}

export async function fetchWeekStundenplan(
  school: string,
  user: string,
  pass: string,
  dateStr?: string
): Promise<TimetableWeekData> {
  const anchorDate = dateStr ? parseDateStr(dateStr) : new Date();
  const weekDates = getWeekDates(anchorDate);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];
  const weekDateStrs = weekDates.map(formatDateStr);

  const settled = await Promise.allSettled(
    weekDateStrs.map(date => fetchDayTimetable(school, user, pass, date))
  );

  const failures = settled.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
  const authFailure = failures.find(result => result.reason?.message?.includes('Ungültig'));
  if (authFailure) throw authFailure.reason;

  if (failures.length > 0) {
    const firstFailure = failures[0].reason;
    const message = firstFailure instanceof Error ? firstFailure.message : String(firstFailure);
    throw new Error(message || 'Stundenplanwoche konnte nicht vollständig geladen werden.');
  }

  const days: TimetableDayData[] = settled.map(result => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });

  const availableClasses = new Set<string>();
  const availableRooms = new Set<string>();
  const availableTeachers = new Set<string>();

  days.forEach(day => {
    day.availableClasses.forEach(value => availableClasses.add(value));
    day.availableRooms.forEach(value => availableRooms.add(value));
    day.availableTeachers.forEach(value => availableTeachers.add(value));
  });

  return {
    title: 'Stundenplan',
    date: formatWeekLabel(weekStart, weekEnd),
    currentDateStr: formatDateStr(anchorDate),
    weekStartStr: formatDateStr(weekStart),
    days,
    availableClasses: Array.from(availableClasses).sort(),
    availableRooms: Array.from(availableRooms).sort(),
    availableTeachers: Array.from(availableTeachers).sort(),
  };
}
