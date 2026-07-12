import cron from 'node-cron';
import webpush from 'web-push';
import { fetchWeekStundenplan } from '../src/lib/stundenplan';
import { listPushSubscribers, markSeen, removePushSubscription } from '../src/lib/server/subscriberStore';
import { computeNotifications } from '../src/lib/server/notifyDiff';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set for the notify worker.');
}

webpush.setVapidDetails('mailto:noreply@timetablex.app', vapidPublicKey, vapidPrivateKey);

async function runOnce() {
  const subscribers = listPushSubscribers();

  for (const subscriber of subscribers) {
    const classes = subscriber.favorites.filter(f => f.mode === 'class').map(f => f.value);
    if (classes.length === 0) continue;

    let week;
    try {
      week = await fetchWeekStundenplan(subscriber.credentials.school, subscriber.credentials.user, subscriber.credentials.pass);
    } catch (error) {
      console.error(`Failed to fetch plan for subscriber ${subscriber.id}:`, error);
      continue;
    }

    const notifications = computeNotifications(week, classes, subscriber.seen);
    if (notifications.length === 0) continue;

    const deliveredKeys: string[] = [];
    for (const notification of notifications) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscriber.subscription.endpoint,
            keys: { p256dh: subscriber.subscription.p256dh, auth: subscriber.subscription.auth },
          },
          JSON.stringify({ title: notification.title, body: notification.body, url: '/app' })
        );
        deliveredKeys.push(notification.key);
      } catch (error: any) {
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          removePushSubscription(subscriber.id);
          break;
        }
        console.error(`Failed to send push to subscriber ${subscriber.id}:`, error);
      }
    }

    if (deliveredKeys.length > 0) {
      markSeen(subscriber.id, deliveredKeys);
    }
  }
}

// Every 15 minutes, Mon–Fri, 06:00–17:00 local time.
cron.schedule('*/15 6-17 * * 1-5', () => {
  runOnce().catch(error => console.error('notify worker run failed:', error));
});

console.log('TimetableX notify worker started.');
