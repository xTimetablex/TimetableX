import { XCircle } from 'lucide-react';
import { getChangedFields, hasInfo, isCancelledEntry } from '@/lib/lessonStatus';
import { TimetableEntry } from '@/lib/types';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const isBlank = (value: string) => !value || value === '---';

/**
 * Lessons of one day. A container query (see `.lesson` in globals.css) lays
 * each lesson out on one line when there is room and on two lines otherwise,
 * so the info text (the actual substitution) is always visible without
 * scrolling sideways, on phones and in the narrow week cards alike.
 */
export default function LessonList({
  entries,
  showClass,
}: {
  entries: TimetableEntry[];
  showClass: boolean;
}) {
  return (
    <ol className="lesson-list" aria-label="Stunden">
      {entries.map((entry, index) => {
        const cancelled = isCancelledEntry(entry);
        const changed = getChangedFields(entry);
        const withInfo = hasInfo(entry);

        return (
          <li
            key={`${index}-${entry.class}-${entry.hour}-${entry.subject}`}
            className={cx('lesson', cancelled && 'is-cancelled', !withInfo && 'no-info')}
          >
            <span className={cx('lesson-hour', changed.hour && 'is-changed')}>
              <span className="sr-only">Stunde </span>
              {entry.hour}
            </span>

            <div className="lesson-main">
              <span className={cx('lesson-subject', changed.subject && 'is-changed')}>
                {cancelled && <XCircle className="size-4 flex-shrink-0" strokeWidth={2} aria-hidden />}
                <span className="lesson-subject-text">{entry.subject}</span>
                {cancelled && <span className="sr-only"> (fällt aus)</span>}
              </span>
              <span className="lesson-meta">
                {showClass && !isBlank(entry.class) && (
                  <span>
                    <span className="sr-only">Klasse </span>
                    {entry.class}
                  </span>
                )}
                {!isBlank(entry.teacher) && (
                  <span className={cx(changed.teacher && 'is-changed')}>
                    <span className="sr-only">Lehrer </span>
                    {entry.teacher}
                  </span>
                )}
              </span>
            </div>

            {!isBlank(entry.room) ? (
              <span className={cx('lesson-room room-badge', changed.room && 'is-changed')}>
                <span className="sr-only">Raum </span>
                {entry.room}
              </span>
            ) : (
              <span className="lesson-room" aria-hidden />
            )}

            {withInfo && <p className="lesson-info">{entry.info}</p>}
          </li>
        );
      })}
    </ol>
  );
}
