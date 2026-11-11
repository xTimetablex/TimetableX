// Browser Sentry events are sent here (`tunnelRoute` in next.config.ts) and
// forwarded server-side. Only the event payload reaches Sentry, so users'
// browsers never connect to Sentry directly (no client IP sent to Sentry) and
// ad blockers don't drop error reports.
export { POST } from '@sentry/nextjs/tunnel';
