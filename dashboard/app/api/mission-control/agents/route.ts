import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import type { AgentActivity } from '@/lib/mission-control/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const endpoint = process.env.OLYMPUS_MISSION_CONTROL_ENDPOINT;
    if (endpoint) {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (res.ok) {
        const data: AgentActivity[] = await res.json();
        return NextResponse.json(data);
      }
    }

    const mockPath = path.join(process.cwd(), 'data', 'mission-control-mock.json');
    const raw = await readFile(mockPath, 'utf-8');
    const data: AgentActivity[] = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'mission_control_unavailable', detail: String(err) },
      { status: 503 },
    );
  }
}
