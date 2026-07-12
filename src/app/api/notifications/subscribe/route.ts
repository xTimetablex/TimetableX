import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthCredentials } from '@/lib/server/authSession';
import { upsertSubscriber, deleteSubscriber } from '@/lib/server/subscriberStore';

const FavoriteSchema = z.object({
  mode: z.enum(['class', 'room', 'teacher']),
  value: z.string().min(1),
});

const SubscribeSchema = z.object({
  id: z.string().min(1),
  favorites: z.array(FavoriteSchema),
  subscription: z
    .object({
      endpoint: z.string().min(1),
      keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
    })
    .nullable(),
});

const UnsubscribeSchema = z.object({ id: z.string().min(1) });

export async function POST(request: Request) {
  const credentials = getAuthCredentials(request);
  if (!credentials) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const body = await request.json();
  const result = SubscribeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { id, favorites, subscription } = result.data;
  const { icsToken } = upsertSubscriber({
    id,
    credentials,
    favorites,
    subscription: subscription
      ? { endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
      : null,
  });

  const origin = new URL(request.url).origin;
  return NextResponse.json({ icsUrl: `${origin}/api/calendar/${icsToken}.ics` });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const result = UnsubscribeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  deleteSubscriber(result.data.id);
  return NextResponse.json({ ok: true });
}
