import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthCredentials, getAccountId } from '@/lib/server/authSession';
import {
  activateFeed,
  deactivateFeed,
  listFeedsForAccount,
  Feed,
} from '@/lib/server/feedStore';

const ActivateSchema = z.object({
  entityType: z.enum(['class', 'teacher']),
  entityValue: z.string().min(1, 'Auswahl fehlt.'),
});

const DeactivateSchema = z.object({ token: z.string().min(1) });

function icsUrlFor(request: Request, token: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  return `${origin}/api/calendar/${token}.ics`;
}

function serializeFeed(request: Request, feed: Feed) {
  return {
    token: feed.token,
    entityType: feed.entityType,
    entityValue: feed.entityValue,
    icsUrl: icsUrlFor(request, feed.token),
  };
}

export async function GET(request: Request) {
  const credentials = getAuthCredentials(request);
  if (!credentials) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const feeds = listFeedsForAccount(getAccountId(credentials));
  return NextResponse.json({ feeds: feeds.map(feed => serializeFeed(request, feed)) });
}

export async function POST(request: Request) {
  const credentials = getAuthCredentials(request);
  if (!credentials) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const result = ActivateSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const feed = activateFeed({
    accountId: getAccountId(credentials),
    school: credentials.school,
    entityType: result.data.entityType,
    entityValue: result.data.entityValue,
  });

  return NextResponse.json(serializeFeed(request, feed));
}

export async function DELETE(request: Request) {
  const credentials = getAuthCredentials(request);
  if (!credentials) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const result = DeactivateSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  deactivateFeed(getAccountId(credentials), result.data.token);
  return NextResponse.json({ ok: true });
}
