import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import type { OlympusState } from '@/lib/olympus/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeOlympusState(live: OlympusState, fallback: OlympusState): OlympusState {
  return {
    ...fallback,
    ...live,
    agents: (live.agents ?? fallback.agents).map((agent) =>
      (agent.agent as string) === 'thor'
        ? { ...agent, agent: 'anubis' as const }
        : agent
    ),
    whale_flow: live.whale_flow && live.whale_flow.length > 0 ? live.whale_flow : fallback.whale_flow,
    trading_bots: live.trading_bots && live.trading_bots.length > 0 ? live.trading_bots : fallback.trading_bots,
    macro_brief: live.macro_brief ?? fallback.macro_brief ?? null,
  };
}

export async function GET() {
  try {
    const mockPath = path.join(process.cwd(), 'data', 'olympus-mock.json');
    const raw = await readFile(mockPath, 'utf-8');
    const fallback: OlympusState = JSON.parse(raw);

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
        const normalized = normalizeOlympusState(data, fallback);
        return NextResponse.json(normalized);
      }
      // Log non-ok but fall through to mock
      console.warn('[olympus/state] Droplet returned', res.status, '— falling back to mock');
    }

    return NextResponse.json(fallback);
  } catch (err) {
    return NextResponse.json(
      { error: 'olympus_state_unavailable', detail: String(err) },
      { status: 503 },
    );
  }
}
