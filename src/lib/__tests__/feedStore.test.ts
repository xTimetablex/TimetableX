import { beforeEach, describe, expect, it, vi } from 'vitest';

// Each test loads feedStore against a fresh in-memory SQLite. Rebinding SQLITE_PATH then getting a
// clean db connection requires re-importing after vi.resetModules() — a module-loading boundary.
async function freshStore() {
  vi.resetModules();
  process.env.SQLITE_PATH = ':memory:';
  return import('../server/feedStore');
}

beforeEach(() => {
  vi.resetModules();
});

describe('feedStore', () => {
  it('gives two accounts the same token for the same class', async () => {
    const store = await freshStore();
    const a = store.activateFeed({ accountId: 'A', school: 's', entityType: 'class', entityValue: '9/2' });
    const b = store.activateFeed({ accountId: 'B', school: 's', entityType: 'class', entityValue: '9/2' });

    expect(a.token).toBe(b.token);
  });

  it('separates class and teacher feeds and different values', async () => {
    const store = await freshStore();
    const cls = store.activateFeed({ accountId: 'A', school: 's', entityType: 'class', entityValue: '9/2' });
    const teacher = store.activateFeed({ accountId: 'A', school: 's', entityType: 'teacher', entityValue: '9/2' });
    const otherClass = store.activateFeed({ accountId: 'A', school: 's', entityType: 'class', entityValue: '10/1' });

    expect(new Set([cls.token, teacher.token, otherClass.token]).size).toBe(3);
  });

  it('scopes feeds by school', async () => {
    const store = await freshStore();
    const one = store.activateFeed({ accountId: 'A', school: 's1', entityType: 'class', entityValue: '9/2' });
    const two = store.activateFeed({ accountId: 'A', school: 's2', entityType: 'class', entityValue: '9/2' });

    expect(one.token).not.toBe(two.token);
  });

  it('lists an account feeds and resolves tokens', async () => {
    const store = await freshStore();
    const feed = store.activateFeed({ accountId: 'A', school: 's', entityType: 'class', entityValue: '9/2' });

    expect(store.listFeedsForAccount('A')).toEqual([feed]);
    expect(store.getFeedByToken(feed.token)).toEqual(feed);
  });

  it('keeps a shared feed until the last account detaches', async () => {
    const store = await freshStore();
    const feed = store.activateFeed({ accountId: 'A', school: 's', entityType: 'class', entityValue: '9/2' });
    store.activateFeed({ accountId: 'B', school: 's', entityType: 'class', entityValue: '9/2' });

    store.deactivateFeed('A', feed.token);
    expect(store.getFeedByToken(feed.token)).toEqual(feed);
    expect(store.listFeedsForAccount('A')).toEqual([]);

    store.deactivateFeed('B', feed.token);
    expect(store.getFeedByToken(feed.token)).toBeNull();
  });
});
