// Options shared by the browser (src/instrumentation-client.ts) and server
// (src/sentry.server.config.ts) Sentry SDKs.
//
// Without a DSN the SDK is a no-op, so local dev only reports to Sentry if
// NEXT_PUBLIC_SENTRY_DSN is set (e.g. in .env.local). Production gets it as a
// Docker build arg from .github/workflows/deploy.yml.

export const sharedSentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // School credentials flow through this app in plaintext: the login body
  // `{ school, user, pass }` and `fetchDayTimetable(school, user, pass)`.
  // Sentry's built-in denylist matches "password"/"passwd"/"pwd" but NOT
  // "pass", so don't rely on scrubbing: switch off every category that could
  // carry credentials or identify a user.
  dataCollection: {
    userInfo: false, // no IP addresses or inferred user identity
    cookies: false, // `timetablex_session` holds the encrypted credentials
    httpBodies: [], // POST /api/auth carries the plaintext password
    httpHeaders: { deny: ['cookie', 'forwarded', '-ip', 'remote-', 'via', '-user'] },
    stackFrameVariables: false, // local variables such as `pass`
  },
};
