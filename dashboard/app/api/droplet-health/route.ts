import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const endpoint = process.env.OLYMPUS_ENDPOINT ?? 'http://100.78.199.123:8085';
  const token = process.env.OLYMPUS_STATE_TOKEN;

  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${endpoint}/health`, {
      cache: 'no-store',
      headers,
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return NextResponse.json({ status: 'online', latencyMs: null });
    }
    // Fallback: try /state if /health not implemented
    const res2 = await fetch(`${endpoint}/state`, {
      cache: 'no-store',
      headers,
      signal: AbortSignal.timeout(4000),
    });
    if (res2.ok) {
      return NextResponse.json({ status: 'online', latencyMs: null });
    }
    return NextResponse.json({ status: 'degraded' }, { status: 200 });
  } catch {
    return NextResponse.json({ status: 'offline' }, { status: 200 });
  }
}
