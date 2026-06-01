import { NextResponse } from 'next/server';
import { ODYSSEUS_URL } from '@/lib/odysseus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-side reachability probe for the Odysseus workspace. Any HTTP response
// (200, redirect to /login, 401, etc.) means it's reachable on the tailnet.
export async function GET() {
  try {
    const res = await fetch(`${ODYSSEUS_URL}/`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    return NextResponse.json({ status: res.status < 500 ? 'online' : 'degraded' });
  } catch {
    return NextResponse.json({ status: 'offline' });
  }
}
