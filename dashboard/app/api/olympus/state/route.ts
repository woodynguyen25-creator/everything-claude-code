import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import type { OlympusState, StrategicAction } from '@/lib/olympus/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function hasLiveEquityMovement(live: OlympusState): boolean {
  const realized = Number(live.total_realized_pnl);
  const unrealized = Number(live.total_unrealized_pnl);
  const moved = (Number.isFinite(realized) && realized !== 0) || (Number.isFinite(unrealized) && unrealized !== 0);
  const curve = Array.isArray(live.equity_curve) ? live.equity_curve : [];
  return moved && curve.length > 1;
}

function dedupeActions(actions: StrategicAction[]): StrategicAction[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.action_type}|${action.ticker}|${action.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeOlympusState(live: OlympusState, fallback: OlympusState): OlympusState {
  const useLiveEquity = hasLiveEquityMovement(live);
  const decisions = live.decisions ?? fallback.decisions;
  return {
    ...fallback,
    ...live,
    // A voided/resolved decision must never render as an open position, even
    // if the Droplet still groups it under `approved`.
    decisions: {
      ...decisions,
      approved: (decisions.approved ?? []).filter((d) => d.status === 'active'),
    },
    // Equity is only "live" when the Droplet shows real PnL movement; otherwise
    // these figures are the mock fallback and must be badged as a sample.
    equity_source: useLiveEquity ? 'live' : 'sample',
    agents: (live.agents ?? fallback.agents).map((agent) =>
      (agent.agent as string) === 'thor'
        ? { ...agent, agent: 'anubis' as const }
        : agent
    ),
    whale_flow: live.whale_flow && live.whale_flow.length > 0 ? live.whale_flow : fallback.whale_flow,
    trading_bots: live.trading_bots && live.trading_bots.length > 0 ? live.trading_bots : fallback.trading_bots,
    macro_brief: live.macro_brief ?? fallback.macro_brief ?? null,
    macro_brief_source: live.macro_brief ? 'live' : 'sample',
    current_equity: useLiveEquity ? live.current_equity : fallback.current_equity,
    starting_equity: live.starting_equity ?? fallback.starting_equity,
    total_realized_pnl: useLiveEquity ? live.total_realized_pnl : fallback.total_realized_pnl,
    total_unrealized_pnl: useLiveEquity ? live.total_unrealized_pnl : fallback.total_unrealized_pnl,
    equity_curve: useLiveEquity ? live.equity_curve : fallback.equity_curve,
    strategic_actions: dedupeActions(live.strategic_actions ?? fallback.strategic_actions ?? []),
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

      try {
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
        console.warn('[olympus/state] Droplet returned', res.status, '— falling back to mock');
      } catch (fetchErr) {
        console.warn('[olympus/state] Droplet unreachable, falling back to mock:', String(fetchErr));
      }
    }

    // No endpoint configured, or the Droplet was unreachable/errored: this is
    // pure mock data, never real equity. Badge it as a sample.
    return NextResponse.json({
      ...fallback,
      equity_source: 'sample',
      macro_brief_source: 'sample',
      strategic_actions: dedupeActions(fallback.strategic_actions ?? []),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'olympus_state_unavailable', detail: String(err) },
      { status: 503 },
    );
  }
}
