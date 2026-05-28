import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const endpoint = process.env.OLYMPUS_ENDPOINT;
  const token = process.env.OLYMPUS_STATE_TOKEN;

  if (!endpoint) {
    return NextResponse.json(
      { status: 'not_configured', message: 'OLYMPUS_ENDPOINT not set' },
      { status: 404 },
    );
  }

  try {
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${endpoint}/rh_portfolio`, {
      cache: 'no-store',
      headers,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { status: 'not_configured', message: `Droplet returned ${res.status}` },
        { status: 404 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { status: 'not_configured', message: String(err) },
      { status: 503 },
    );
  }
}

export async function HEAD() {
  const endpoint = process.env.OLYMPUS_ENDPOINT;
  const token = process.env.OLYMPUS_STATE_TOKEN;
  if (!endpoint) return new NextResponse(null, { status: 404 });

  try {
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${endpoint}/rh_portfolio`, {
      method: 'HEAD',
      cache: 'no-store',
      headers,
      signal: AbortSignal.timeout(4000),
    });
    return new NextResponse(null, { status: res.ok ? 200 : 404 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
