import * as Sentry from '@sentry/nextjs';
import { sharedSentryOptions } from '@/lib/sentryOptions';

Sentry.init({
  ...sharedSentryOptions,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
      // Default `true` persists the replay session in sessionStorage. Browser
      // Sentry runs without consent (legitimate interest), so it must not store
      // anything on the device (§25 TDDDG).
      stickySession: false,
    }),
  ],

  // Only keep replays of sessions that hit an error (buffered in memory until then).
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
