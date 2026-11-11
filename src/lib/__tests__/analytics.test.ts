// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const init = vi.fn();
const capture = vi.fn();
const optOut = vi.fn();
const setConfig = vi.fn();
vi.mock('posthog-js', () => ({
  default: { init, capture, opt_out_capturing: optOut, set_config: setConfig },
}));

// analytics.ts keeps module-level state, so every test loads a fresh copy.
async function loadAnalytics() {
  vi.resetModules();
  return import('../analytics');
}

describe('analytics', () => {
  beforeEach(() => {
    init.mockClear();
    capture.mockClear();
    optOut.mockClear();
    setConfig.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not load PostHog without a project key', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    const { initAnalytics, track } = await loadAnalytics();

    await initAnalytics();
    track('test_event');

    expect(init).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('drops events until PostHog has been initialised', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    const { track } = await loadAnalytics();

    track('before_consent');

    expect(capture).not.toHaveBeenCalled();
  });

  it('initialises PostHog EU through the same-origin proxy, once', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    const { initAnalytics, POSTHOG_PROXY_PATH } = await loadAnalytics();

    await Promise.all([initAnalytics(), initAnalytics()]);

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: POSTHOG_PROXY_PATH,
        ui_host: 'https://eu.posthog.com',
        disable_session_recording: true,
      })
    );
  });

  it('forwards events after initialisation', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    const { initAnalytics, track } = await loadAnalytics();

    await initAnalytics();
    track('favorite_toggled', { action: 'added' });

    expect(capture).toHaveBeenCalledWith('favorite_toggled', { action: 'added' });
  });
});

describe('disableAnalytics (consent withdrawn)', () => {
  beforeEach(() => {
    optOut.mockClear();
    setConfig.mockClear();
    capture.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('removes PostHog cookies and storage keys but keeps everything else', async () => {
    document.cookie = 'ph_phc_test_posthog=%7B%7D; path=/';
    document.cookie = 'timetablex_tracking_consent=rejected; path=/';
    localStorage.setItem('ph_phc_test_posthog', '{}');
    localStorage.setItem('__ph_opt_in_out_phc_test', '0');
    localStorage.setItem('favorites', '[]');
    sessionStorage.setItem('ph_phc_test_window_id', 'x');
    const { disableAnalytics } = await loadAnalytics();

    expect(disableAnalytics()).toBe(false);

    expect(document.cookie).not.toContain('ph_phc_test_posthog');
    expect(document.cookie).toContain('timetablex_tracking_consent=rejected');
    expect(localStorage.getItem('ph_phc_test_posthog')).toBeNull();
    expect(localStorage.getItem('__ph_opt_in_out_phc_test')).toBeNull();
    expect(localStorage.getItem('favorites')).toBe('[]');
    expect(sessionStorage.getItem('ph_phc_test_window_id')).toBeNull();
    expect(optOut).not.toHaveBeenCalled();
  });

  it('opts a loaded PostHog out and stops it persisting, then drops events', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    const { initAnalytics, disableAnalytics, track } = await loadAnalytics();
    await initAnalytics();

    expect(disableAnalytics()).toBe(true);
    expect(optOut).toHaveBeenCalledTimes(1);
    expect(setConfig).toHaveBeenCalledWith({ disable_persistence: true });

    track('after_withdrawal');
    expect(capture).not.toHaveBeenCalled();
  });
});
