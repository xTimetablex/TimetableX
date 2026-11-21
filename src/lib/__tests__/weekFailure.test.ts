import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTimetableCache, fetchWeekStundenplan, TimetableUnavailableError } from '../stundenplan';

describe('fetchWeekStundenplan', () => {
  beforeEach(() => {
    clearTimetableCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces day-level fetch failures instead of returning empty fallback days', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Verbindung zum Stundenplan fehlgeschlagen.'))
    );

    const result = fetchWeekStundenplan('school', 'user', 'pass', '20260608');
    await expect(result).rejects.toBeInstanceOf(TimetableUnavailableError);
    await expect(result).rejects.toThrow('Verbindung');
  });

  it('lets an auth failure win over other failed days', async () => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        call += 1;
        if (call === 3) return new Response('', { status: 401 });
        throw new TypeError('fetch failed');
      })
    );

    await expect(fetchWeekStundenplan('school', 'user', 'pass', '20260608')).rejects.toThrow(
      'Ungültiger Benutzername oder Passwort.'
    );
  });
});
