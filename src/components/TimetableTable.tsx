'use client';

import { TimetableEntry } from '@/lib/types';
import { isCancelledEntry } from '@/lib/timetableEntry';
import { CheckCircle2, XCircle } from 'lucide-react';

interface TimetableTableProps {
  entries: TimetableEntry[];
  showClassColumn: boolean;
  compact?: boolean;
  isSelectionAvailable?: boolean;
  selectionLabel?: string;
}

function changeFlags(infoRaw: string) {
  const info = (infoRaw || '').toLowerCase();
  if (!info || info === '---') return { room: false, teacher: false, hour: false, class: false, subject: false };

  // Room changes often mention "raum", "zimmer", "r." or "geändert"
  const room = /(raum|r\.|zimmer)/.test(info);
  // Teacher changes: "für", "vertretung", "vtr", "lehr", "statt"
  const teacher = /(für|vertret|vtr|lehr)/.test(info);
  // Hour changes: "verlegt", "st.", "std", "zeit"
  const hour = /(verlegt|st\.|std|zeit|block|uhr)/.test(info);
  // Class changes: "klasse", "kurs", "kl.", "gruppe"
  const className = /(klasse|kurs|kl\.|gruppe)/.test(info);
  // Subject changes: "fach", "statt" (if not teacher)
  const subject = /fach/.test(info) || ( /statt/.test(info) && !teacher );

  return { room, teacher, hour, class: className, subject };
}

export default function TimetableTable({ entries, showClassColumn, compact = false, isSelectionAvailable = true, selectionLabel }: TimetableTableProps) {
  if (entries.length === 0) {
    const subtitle = !isSelectionAvailable && selectionLabel
      ? `${selectionLabel} ist heute nicht im Vertretungsplan.`
      : 'Für diese Auswahl gibt es keine Vertretungen.';
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div
          className="flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
          }}
        >
          <CheckCircle2 className="size-7" strokeWidth={1.75} />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            Keine Einträge
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {subtitle}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? 'overflow-hidden table-wrap' : 'overflow-x-auto table-wrap'}>
      <table
        className="w-full"
        style={{
          borderCollapse: 'collapse',
          tableLayout: compact ? 'fixed' : 'auto',
        }}
        aria-label="Vertretungsplan"
      >
        {/* Accessible column headers (visually hidden) */}
        <thead className="sr-only">
          <tr>
            <th scope="col">Stunde</th>
            <th scope="col">Fach</th>
            {showClassColumn && <th scope="col">Klasse</th>}
            <th scope="col">Lehrer</th>
            <th scope="col">Raum</th>
            <th scope="col">Info</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const cancelled = isCancelledEntry(e);
            const flags = changeFlags(e.info);
            
            // Combine textual flags with direct flags from data
            const roomChanged = flags.room || e.roomChanged;
            const teacherChanged = flags.teacher || e.teacherChanged;
            const hourChanged = flags.hour || e.hourChanged;
            const classChanged = flags.class; // Usually not in XML flags
            const subjectChanged = flags.subject || e.subjectChanged;
            
            const isLast = i === entries.length - 1;

            return (
              <tr
                key={`${e.hour}-${e.subject}-${e.room}-${e.teacher}`}
                className={`table-row ${cancelled ? 'cancelled' : ''}`}
                style={{
                  borderBottom: isLast ? 'none' : `1px solid ${cancelled ? 'var(--color-danger-border)' : 'var(--color-border-subtle)'}`,
                }}
              >
                {/* Hour */}
                <td
                  className="text-center font-bold text-base"
                  style={{
                    padding: compact ? '0.75rem 0.5rem 0.75rem 0.75rem' : '1rem 0.75rem 1rem 1.25rem',
                    color: cancelled || hourChanged ? 'var(--color-danger)' : 'var(--color-text)',
                    width: compact ? 38 : 52,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {e.hour}
                </td>

                {/* Subject */}
                <td
                  style={{
                    padding: compact ? '0.75rem 0.6rem' : '1rem 1rem',
                    minWidth: compact ? 0 : 100,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {cancelled && (
                      <XCircle
                        className="size-4 flex-shrink-0"
                        style={{ color: 'var(--color-danger)' }}
                        strokeWidth={2}
                        aria-label="Ausfall"
                      />
                    )}
                    <span
                      className={`font-semibold ${compact ? 'text-sm leading-snug break-words' : 'text-base'}`}
                      style={{
                        color: cancelled || subjectChanged ? 'var(--color-danger)' : 'var(--color-text)',
                        textDecorationLine: cancelled ? 'line-through' : 'none',
                        textDecorationColor: 'var(--color-danger)',
                      }}
                    >
                      {e.subject}
                    </span>
                  </div>
                </td>

                {/* Class (conditional) */}
                {showClassColumn && (
                  <td
                    className={`font-medium ${compact ? 'text-xs leading-snug break-words' : 'text-sm'}`}
                    style={{
                      padding: compact ? '0.75rem 0.6rem' : '1rem 1rem',
                      color: cancelled || classChanged ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                      whiteSpace: compact ? 'normal' : 'nowrap',
                    }}
                  >
                    {e.class}
                  </td>
                )}

                {/* Teacher */}
                <td
                  className={`font-medium ${compact ? 'text-xs leading-snug break-words' : 'text-sm'}`}
                  style={{
                    padding: compact ? '0.75rem 0.6rem' : '1rem 1rem',
                    color: cancelled || teacherChanged ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                    whiteSpace: compact ? 'normal' : 'nowrap',
                  }}
                >
                  {e.teacher}
                </td>

                {/* Room */}
                <td
                  className={`font-semibold ${compact ? 'text-xs leading-snug' : 'text-sm'}`}
                  style={{
                    padding: compact ? '0.75rem 0.6rem' : '1rem 1rem',
                    whiteSpace: compact ? 'normal' : 'nowrap',
                  }}
                >
                  <span
                    className="badge"
                    style={{
                      background: cancelled || roomChanged ? 'var(--color-danger-bg)' : 'var(--color-primary-light)',
                      color: cancelled || roomChanged ? 'var(--color-danger)' : 'var(--color-primary)',
                      border: cancelled || roomChanged ? `1px solid var(--color-danger-border)` : 'none',
                    }}
                  >
                    {e.room}
                  </span>
                </td>

                {/* Info */}
                <td
                  className={compact ? 'text-xs' : 'text-sm'}
                  style={{
                    padding: compact ? '0.75rem 0.6rem 0.75rem 0.4rem' : '1rem 1.25rem 1rem 0.75rem',
                    color: cancelled ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                    fontStyle: e.info && e.info !== '---' ? 'normal' : 'italic',
                    maxWidth: compact ? 'none' : 260,
                    whiteSpace: compact ? 'normal' : 'nowrap',
                  }}
                >
                  {e.info || ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

