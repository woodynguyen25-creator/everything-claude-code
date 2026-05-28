import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Honest fallback when Droplet is unreachable.
// Real spend lives on the Droplet (~$0 today since agents haven't logged token metadata yet).
// Showing a fake $8.17/$15 amber state when offline would be more alarming than useful.
const MOCK_COST_STATE = {
  monthly_cap: 15.0,
  mtd_total: 0,
  mtd_pct: 0,
  daily_burn_30d: new Array(30).fill(0),
  forecast_eom: 0,
  status: 'green' as const,
  offline: true,
};

export async function GET() {
  const baseEndpoint = process.env.OLYMPUS_ENDPOINT || 'http://142.93.12.177:8085';
  const costEndpoint = process.env.OLYMPUS_COST_ENDPOINT || `${baseEndpoint}/cost/state`;
  const token = process.env.OLYMPUS_STATE_TOKEN;

  if (token) {
    try {
      const res = await fetch(costEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return NextResponse.json(await res.json());
      console.warn('[cost/state] Droplet returned', res.status, '— falling back to mock');
    } catch (fetchErr) {
      console.warn('[cost/state] Droplet unreachable, falling back to mock:', String(fetchErr));
    }
  }

  return NextResponse.json(MOCK_COST_STATE);
}
