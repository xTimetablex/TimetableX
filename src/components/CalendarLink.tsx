'use client';

import { useMemo, useState } from 'react';
import { Calendar, Copy, Check, Trash2, Users, User } from 'lucide-react';
import { Button } from './button';
import CalendarPicker, { PickerItem, feedKey } from './CalendarPicker';
import { useCalendarFeeds } from '@/lib/hooks/useCalendarFeeds';

interface CalendarLinkProps {
  items: PickerItem[];
}

export default function CalendarLink({ items }: CalendarLinkProps) {
  const { feeds, isBusy, add, remove } = useCalendarFeeds();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const activeKeys = useMemo(
    () => new Set(feeds.map(f => feedKey(f.entityType, f.entityValue))),
    [feeds]
  );

  const copy = (token: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(prev => (prev === token ? null : prev)), 2000);
  };

  return (
    <div
      className="mt-4 p-4 rounded-lg flex flex-col gap-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Calendar className="size-4" strokeWidth={2} />
          <span className="text-sm font-medium">TimetableX zu deinem Kalender hinzufügen</span>
        </div>
        <Button
          onClick={() => setIsPickerOpen(true)}
          variant="primary"
          disabled={items.length === 0}
          className="min-w-[120px]"
        >
          Aktivieren
        </Button>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Wähle eine Klasse oder einen Lehrer aus. Alle mit derselben Auswahl teilen sich einen Kalender-Link.
      </p>

      {feeds.length > 0 && (
        <ul className="flex flex-col gap-2">
          {feeds.map(feed => (
            <li
              key={feed.token}
              className="flex items-center gap-2 p-2 rounded"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-subtle)' }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
              >
                {feed.entityType === 'class' ? (
                  <Users className="size-3.5" strokeWidth={1.75} />
                ) : (
                  <User className="size-3.5" strokeWidth={1.75} />
                )}
              </div>
              <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--color-text)' }}>
                {feed.entityValue}
              </span>
              <input
                readOnly
                value={feed.icsUrl}
                aria-label={`Kalender-Link für ${feed.entityValue}`}
                className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
              />
              <Button
                variant="icon"
                aria-label="Kalender-Link kopieren"
                onClick={() => copy(feed.token, feed.icsUrl)}
              >
                {copiedToken === feed.token ? (
                  <Check className="size-4" strokeWidth={2} />
                ) : (
                  <Copy className="size-4" strokeWidth={2} />
                )}
              </Button>
              <Button
                variant="iconDanger"
                aria-label={`Kalender für ${feed.entityValue} entfernen`}
                disabled={isBusy}
                onClick={() => remove(feed.token)}
              >
                <Trash2 className="size-4" strokeWidth={2} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CalendarPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        items={items}
        activeKeys={activeKeys}
        isBusy={isBusy}
        onAdd={add}
      />
    </div>
  );
}
