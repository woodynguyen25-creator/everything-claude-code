import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface WhaleAsset {
  signal: string;
  severity: string;
  oi_change_pct: number;
  current_oi_usd_m: number;
  prior_oi_usd_m: number;
  mark_px: number;
  note: string;
  timestamp: string;
  poseidon_signal: string | null;
}

export interface Decision {
  ticker: string;
  stance: string;
  conviction: number;
  strategy: string;
  regime: string;
  timestamp: string;
  agents?: Record<string, { conviction: number; stance: string }>;
}

export interface ActivityRow {
  id: number;
  ts: string;
  agent_name: string;
  action_type: string;
  model_used: string | null;
  ticker: string | null;
  status: string;
  detail: string | null;
}

export interface OlympusIntelPayload {
  whale_oi: Record<string, WhaleAsset> | null;
  decisions: Decision[] | null;
  activity: ActivityRow[] | null;
  fetched_at: string;
  droplet_status: 'online' | 'degraded' | 'offline';
}

async function tryFetch<T>(url: string, headers: HeadersInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const endpoint = process.env.OLYMPUS_ENDPOINT ?? 'http://100.78.199.123:8085';
  const token = process.env.OLYMPUS_STATE_TOKEN;

  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const [whale_oi, decisions, activity] = await Promise.all([
    tryFetch<Record<string, WhaleAsset>>(`${endpoint}/api/whale_oi`, headers),
    tryFetch<Decision[]>(`${endpoint}/api/decisions?n=5`, headers),
    tryFetch<ActivityRow[]>(`${endpoint}/api/activity?n=8`, headers),
  ]);

  const droplet_status: OlympusIntelPayload['droplet_status'] =
    whale_oi != null || decisions != null || activity != null ? 'online' :
    'offline';

  const payload: OlympusIntelPayload = {
    whale_oi,
    decisions,
    activity,
    fetched_at: new Date().toISOString(),
    droplet_status,
  };

  return NextResponse.json(payload);
}
