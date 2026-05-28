import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export type AtlasCheck = {
  name: string;
  ok: boolean;
  detail: string;
  consecutive_failures: number;
  ts: string;
};

export type AtlasState = {
  last_check_ts: string;
  uptime_seconds: number;
  checks: AtlasCheck[];
  all_ok: boolean;
  restarts_today: Record<string, number>;
  keeper_status: string;
  alerts_sent_24h: number;
  offline?: boolean;
};

const MOCK_ATLAS_STATE: AtlasState = {
  last_check_ts: '0',
  uptime_seconds: 0,
  checks: [],
  all_ok: false,
  restarts_today: {},
  keeper_status: 'unknown',
  alerts_sent_24h: 0,
  offline: true,
};

export async function GET() {
  const endpoint = process.env.OLYMPUS_ENDPOINT || 'http://100.78.199.123:8085';
  const token = process.env.OLYMPUS_STATE_TOKEN;

  if (token) {
    try {
      const res = await fetch(`${endpoint}/atlas/state`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return NextResponse.json(await res.json());
      console.warn('[doctor/atlas] Droplet returned', res.status, '— using offline mock');
    } catch (fetchErr) {
      console.warn('[doctor/atlas] Droplet unreachable, using offline mock:', String(fetchErr));
    }
  }

  return NextResponse.json(MOCK_ATLAS_STATE);
}
