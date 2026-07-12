'use client';

import { useState } from 'react';
import { Bell, BellOff, Copy, Check } from 'lucide-react';
import { Button } from './button';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { Favorite } from '@/lib/types';

interface NotificationSettingsProps {
  favorites: Favorite[];
}

export default function NotificationSettings({ favorites }: NotificationSettingsProps) {
  const { isSupported, isEnabled, icsUrl, isBusy, enable, disable } = useNotifications(favorites);
  const [copied, setCopied] = useState(false);

  if (!isSupported) return null;

  const classFavorites = favorites.filter(f => f.mode === 'class');

  return (
    <div
      className="mt-4 p-4 rounded-lg flex flex-col gap-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          {isEnabled ? <Bell className="size-4" strokeWidth={2} /> : <BellOff className="size-4" strokeWidth={2} />}
          <span className="text-sm font-medium">Benachrichtigungen bei Entfall / Raumänderung</span>
        </div>
        <Button
          onClick={() => (isEnabled ? disable() : enable())}
          variant={isEnabled ? 'outline' : 'primary'}
          disabled={isBusy || classFavorites.length === 0}
        >
          {isEnabled ? 'Deaktivieren' : 'Aktivieren'}
        </Button>
      </div>

      {classFavorites.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Füge zuerst eine Klasse als Favorit hinzu.
        </p>
      )}

      {isEnabled && icsUrl && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={icsUrl}
            className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
          />
          <Button
            variant="icon"
            aria-label="Kalender-Link kopieren"
            onClick={() => {
              navigator.clipboard.writeText(icsUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check className="size-4" strokeWidth={2} /> : <Copy className="size-4" strokeWidth={2} />}
          </Button>
        </div>
      )}
    </div>
  );
}
