import { describe, expect, it, beforeEach, vi } from 'vitest';

const CREDS = { school: '12345', user: 'testuser', pass: 'testpass' };
const FAVORITES = [{ mode: 'class' as const, value: '9/2' }];
const SUBSCRIPTION = { endpoint: 'https://push.example/abc', p256dh: 'p256dh-key', auth: 'auth-key' };

async function freshStore() {
  vi.resetModules();
  process.env.SQLITE_PATH = ':memory:';
  return await import('../server/subscriberStore');
}

beforeEach(() => {
  vi.resetModules();
});

describe('subscriberStore', () => {
  it('round-trips credentials and favorites via the ics token', async () => {
    const store = await freshStore();
    const { icsToken } = store.upsertSubscriber({
      id: 'user-1',
      credentials: CREDS,
      favorites: FAVORITES,
      subscription: null,
    });

    const found = store.getSubscriberByIcsToken(icsToken);
    expect(found).toEqual({ credentials: CREDS, favorites: FAVORITES });
  });

  it('returns null for an unknown ics token', async () => {
    const store = await freshStore();
    expect(store.getSubscriberByIcsToken('does-not-exist')).toBeNull();
  });

  it('lists a subscriber with a push subscription for the worker', async () => {
    const store = await freshStore();
    store.upsertSubscriber({
      id: 'user-2',
      credentials: CREDS,
      favorites: FAVORITES,
      subscription: SUBSCRIPTION,
    });

    const subscribers = store.listPushSubscribers();
    expect(subscribers).toHaveLength(1);
    expect(subscribers[0]).toMatchObject({
      id: 'user-2',
      credentials: CREDS,
      favorites: FAVORITES,
      subscription: SUBSCRIPTION,
      seen: [],
    });
  });

  it('excludes subscribers without a push subscription from listPushSubscribers', async () => {
    const store = await freshStore();
    store.upsertSubscriber({ id: 'user-3', credentials: CREDS, favorites: FAVORITES, subscription: null });

    expect(store.listPushSubscribers()).toHaveLength(0);
  });

  it('persists seen keys across markSeen calls', async () => {
    const store = await freshStore();
    store.upsertSubscriber({ id: 'user-4', credentials: CREDS, favorites: FAVORITES, subscription: SUBSCRIPTION });

    store.markSeen('user-4', ['20260601|9/2|1|cancelled']);
    const subscribers = store.listPushSubscribers();
    expect(subscribers[0].seen).toEqual(['20260601|9/2|1|cancelled']);
  });

  it('removes a subscriber entirely on deleteSubscriber', async () => {
    const store = await freshStore();
    const { icsToken } = store.upsertSubscriber({
      id: 'user-5',
      credentials: CREDS,
      favorites: FAVORITES,
      subscription: SUBSCRIPTION,
    });

    store.deleteSubscriber('user-5');
    expect(store.getSubscriberByIcsToken(icsToken)).toBeNull();
    expect(store.listPushSubscribers()).toHaveLength(0);
  });

  it('clears only the push subscription on removePushSubscription, keeping the ics feed alive', async () => {
    const store = await freshStore();
    const { icsToken } = store.upsertSubscriber({
      id: 'user-6',
      credentials: CREDS,
      favorites: FAVORITES,
      subscription: SUBSCRIPTION,
    });

    store.removePushSubscription('user-6');
    expect(store.listPushSubscribers()).toHaveLength(0);
    expect(store.getSubscriberByIcsToken(icsToken)).toEqual({ credentials: CREDS, favorites: FAVORITES });
  });

  it('upsert replaces favorites and subscription for the same id rather than duplicating', async () => {
    const store = await freshStore();
    store.upsertSubscriber({ id: 'user-7', credentials: CREDS, favorites: FAVORITES, subscription: null });
    store.upsertSubscriber({
      id: 'user-7',
      credentials: CREDS,
      favorites: [{ mode: 'class', value: '10/1' }],
      subscription: SUBSCRIPTION,
    });

    const subscribers = store.listPushSubscribers();
    expect(subscribers).toHaveLength(1);
    expect(subscribers[0].favorites).toEqual([{ mode: 'class', value: '10/1' }]);
  });
});
