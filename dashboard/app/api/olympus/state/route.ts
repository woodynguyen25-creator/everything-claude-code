import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import type { OlympusState } from '@/lib/olympus/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const endpoint = process.env.OLYMPUS_ENDPOINT;
    if (endpoint) {
      const headers: HeadersInit = {};
      const token = process.env.OLYMPUS_STATE_TOKEN;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${endpoint}/state`, {
        cache: 'no-store',
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data: OlympusState = await res.json();
        return NextResponse.json(data);
      }
      // Log non-ok but fall through to mock
      console.warn('[olympus/state] Droplet returned', res.status, '— falling back to mock');
    }

    const mockPath = path.join(process.cwd(), 'data', 'olympus-mock.json');
    const raw = await readFile(mockPath, 'utf-8');
    const data: OlympusState = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'olympus_state_unavailable', detail: String(err) },
      { status: 503 },
    );
  }
}
