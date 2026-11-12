// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { migrateLegacyCredentials } from '../authMigration';

const LEGACY_KEY = 'school_creds';

describe('migrateLegacyCredentials', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null and does not call fetch when nothing is stored', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await migrateLegacyCredentials();

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('removes the entry and returns null when it is not valid JSON', async () => {
    localStorage.setItem(LEGACY_KEY, 'not json');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await migrateLegacyCredentials();

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('exchanges valid credentials for a session, removes the entry, and returns the identity', async () => {
    const credentials = { school: 'demo', user: 'alice', pass: 'secret' };
    localStorage.setItem(LEGACY_KEY, JSON.stringify(credentials));

    const identity = { school: 'demo', user: 'alice' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ identity }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await migrateLegacyCredentials();

    expect(result).toEqual(identity);
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  });

  it('removes the entry and returns null when the server rejects the credentials', async () => {
    const credentials = { school: 'demo', user: 'alice', pass: 'wrong' };
    localStorage.setItem(LEGACY_KEY, JSON.stringify(credentials));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Anmeldung fehlgeschlagen.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await migrateLegacyCredentials();

    expect(result).toBeNull();
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('keeps the entry when stundenplan24 was unreachable during the check', async () => {
    const credentials = { school: '12345678', user: 'alice', pass: 'secret' };
    localStorage.setItem(LEGACY_KEY, JSON.stringify(credentials));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) })
    );

    expect(await migrateLegacyCredentials()).toBeNull();
    expect(localStorage.getItem(LEGACY_KEY)).toBe(JSON.stringify(credentials));
  });

  it('keeps the entry and returns null on a network error', async () => {
    const credentials = { school: 'demo', user: 'alice', pass: 'secret' };
    localStorage.setItem(LEGACY_KEY, JSON.stringify(credentials));

    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await migrateLegacyCredentials();

    expect(result).toBeNull();
    expect(localStorage.getItem(LEGACY_KEY)).toBe(JSON.stringify(credentials));
  });
});
