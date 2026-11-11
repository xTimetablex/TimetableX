import type { PostHog } from 'posthog-js';

/**
 * Same-origin reverse proxy to PostHog EU (see `rewrites` in next.config.ts).
 * PostHog advises against generic paths like /analytics or /posthog, which
 * blockers match.
 */
export const POSTHOG_PROXY_PATH = '/ttx';

let posthog: PostHog | null = null;
let loading: Promise<void> | null = null;

/**
 * Loads and starts PostHog. Call this only after the user accepted tracking:
 * until then no PostHog code is downloaded and nothing is stored on the device.
 * Without NEXT_PUBLIC_POSTHOG_KEY (e.g. local dev) it does nothing.
 */
export function initAnalytics(): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === 'undefined') return Promise.resolve();

  loading ??= import('posthog-js')
    .then(({ default: ph }) => {
      ph.init(key, {
        api_host: POSTHOG_PROXY_PATH,
        ui_host: 'https://eu.posthog.com',
        // Pinned config snapshot; includes SPA pageviews on route changes.
        defaults: '2026-08-30',
        // We never identify users, so events stay anonymous (no person profiles).
        person_profiles: 'identified_only',
        // Session Replay already runs (masked, errors only) in Sentry.
        disable_session_recording: true,
        disable_surveys: true,
      });
      posthog = ph;
    })
    .catch(() => {
      loading = null;
    });

  return loading;
}

/**
 * Consent withdrawn: stops PostHog and removes everything it stored (its
 * cookies plus local/session storage keys). Returns whether PostHog had been
 * loaded in this page, in which case the caller should reload so no PostHog
 * code keeps running.
 */
export function disableAnalytics(): boolean {
  const wasLoaded = posthog !== null;
  if (posthog) {
    posthog.opt_out_capturing();
    // Disabling persistence also deletes PostHog's existing cookie/storage entry.
    posthog.set_config({ disable_persistence: true });
    posthog = null;
  }
  clearPostHogStorage();
  return wasLoaded;
}

function clearPostHogStorage() {
  if (typeof window === 'undefined') return;

  const isPostHogKey = (key: string) => key.startsWith('ph_') || key.startsWith('__ph');
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
      keys.filter((key): key is string => !!key && isPostHogKey(key)).forEach(key => storage.removeItem(key));
    } catch {
      // Storage can be unavailable (privacy mode); nothing to clear then.
    }
  }

  // PostHog sets its cookie on the parent domain (cross-subdomain), so expire it
  // for every domain variant it may have used.
  const host = window.location.hostname;
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
  for (const name of document.cookie.split('; ').map(c => c.split('=')[0])) {
    if (!isPostHogKey(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

/** Sends a custom event. A no-op until `initAnalytics()` has loaded PostHog. */
export function track(event: string, props?: Record<string, unknown>) {
  posthog?.capture(event, props);
}
