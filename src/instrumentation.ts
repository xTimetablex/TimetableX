import * as Sentry from '@sentry/nextjs';

export async function register() {
  // The app has no edge routes or proxy, so only the Node.js runtime needs Sentry.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
}

// Reports errors thrown from Server Components, route handlers and rendering.
export const onRequestError = Sentry.captureRequestError;
