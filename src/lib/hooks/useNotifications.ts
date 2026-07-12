'use client';

import { useCallback, useEffect, useState } from 'react';
import { Favorite } from '@/lib/types';
import { track } from '@/lib/analytics';

const SUBSCRIBER_ID_KEY = 'notif_subscriber_id';
const ENABLED_KEY = 'notif_enabled';

function getOrCreateSubscriberId(): string {
  let id = localStorage.getItem(SUBSCRIBER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SUBSCRIBER_ID_KEY, id);
  }
  return id;
}

export function useNotifications(favorites: Favorite[]) {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
    setIsEnabled(localStorage.getItem(ENABLED_KEY) === 'true');
  }, []);

  const enable = useCallback(async () => {
    if (!isSupported) return;
    setIsBusy(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      const id = getOrCreateSubscriberId();
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, favorites, subscription: subscription.toJSON() }),
      });
      if (!res.ok) throw new Error('Anmeldung für Benachrichtigungen fehlgeschlagen.');

      const { icsUrl: url } = await res.json();
      setIcsUrl(url);
      setIsEnabled(true);
      localStorage.setItem(ENABLED_KEY, 'true');
      track('notifications_enabled', { favorite_count: favorites.length });
    } finally {
      setIsBusy(false);
    }
  }, [isSupported, favorites]);

  const disable = useCallback(async () => {
    setIsBusy(true);
    try {
      const id = getOrCreateSubscriberId();
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }).catch(() => undefined);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await subscription?.unsubscribe();

      setIsEnabled(false);
      setIcsUrl(null);
      localStorage.setItem(ENABLED_KEY, 'false');
      track('notifications_disabled');
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { isSupported, isEnabled, icsUrl, isBusy, enable, disable };
}
