import * as Sentry from '@sentry/nextjs';
import { sharedSentryOptions } from '@/lib/sentryOptions';

Sentry.init({
  ...sharedSentryOptions,

  // The only outgoing requests go to stundenplan24.de; don't attach Sentry
  // trace/baggage headers to a third-party service.
  tracePropagationTargets: [],
});
