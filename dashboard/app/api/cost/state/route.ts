import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Cost state is served at /cost/state on the same olympus state server
    const baseEndpoint = process.env.OLYMPUS_ENDPOINT || 'http://142.93.12.177:8085';
    const costEndpoint = process.env.OLYMPUS_COST_ENDPOINT || `${baseEndpoint}/cost/state`;
    const token = process.env.OLYMPUS_STATE_TOKEN;

    if (token) {
      const res = await fetch(costEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return NextResponse.json(await res.json());
    }

    return NextResponse.json({
      monthly_cap: 15.0,
      mtd_total: 8.17,
      mtd_pct: 0.545,
      daily_burn_30d: [
        0.22, 0.31, 0.28, 0.35, 0.41, 0.26, 0.29, 0.38, 0.44, 0.33,
        0.24, 0.27, 0.39, 0.42, 0.36, 0.30, 0.25, 0.34, 0.47, 0.40,
        0.29, 0.32, 0.37, 0.43, 0.34, 0.28, 0.31, 0.45, 0.41, 0.39
      ],
      forecast_eom: 13.5,
      status: 'amber',
    });
  } catch {
    return NextResponse.json({ error: 'cost_unavailable' }, { status: 503 });
  }
}
