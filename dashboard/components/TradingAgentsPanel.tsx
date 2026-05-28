'use client';

import { useEffect, useState } from 'react';

interface Reflection {
  ts: number;
  mode: string;
  change: { field: string | null; from?: number | string; to?: number | string; reason?: string };
  score: { score: number };
}

interface Agent {
  asset: 'btc' | 'eth' | 'spy';
  symbol: string;
  price: number | null;
  rsi: number | null;
  openTrade: boolean;
  strategyVersion: string;
  ts: number | null;
  ageSeconds: number | null;
  status: 'live' | 'stale' | 'unreachable';
  recentTrades: number;
  lastReflection: Reflection | null;
}

const ASSET_META: Record<Agent['asset'], { name: string; tint: string; ring: string }> = {
  btc: { name: 'BTC/USDT', tint: 'from-amber-500/15 to-amber-300/5', ring: 'ring-amber-400/30' },
  eth: { name: 'ETH/USDT', tint: 'from-violet-500/15 to-indigo-300/5', ring: 'ring-violet-400/30' },
  spy: { name: 'SPY', tint: 'from-emerald-500/15 to-sky-300/5', ring: 'ring-emerald-400/30' },
};

function StatusDot({ status }: { status: Agent['status'] }) {
  const color =
    status === 'live'
      ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
      : status === 'stale'
        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
        : 'bg-red-500/80';
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/55">
      <span className={`inline-block size-1.5 rounded-full ${color}`} />
      {status}
    </span>
  );
}

function fmtPrice(p: number | null, asset: Agent['asset']) {
  if (p === null) return '—';
  if (asset === 'btc') return `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (asset === 'eth') return `$${p.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return `$${p.toFixed(2)}`;
}

function fmtAge(s: number | null) {
  if (s === null) return '—';
  if (s < 90) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function fmtScore(n: number | undefined) {
  if (n === undefined || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  const color = n > 0.2 ? 'text-emerald-300' : n < -0.2 ? 'text-red-300' : 'text-white/70';
  return <span className={color}>{sign}{n.toFixed(2)}</span>;
}

function AgentTile({ agent }: { agent: Agent }) {
  const meta = ASSET_META[agent.asset];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br ${meta.tint} p-5 shadow-[0_8px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl ring-1 ${meta.ring} ring-inset`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">Agent</div>
          <div className="mt-0.5 text-base font-medium text-white">{meta.name}</div>
        </div>
        <StatusDot status={agent.status} />
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <div className="text-2xl font-light tabular-nums text-white">{fmtPrice(agent.price, agent.asset)}</div>
        <div className="text-xs text-white/55">RSI {agent.rsi?.toFixed(1) ?? '—'}</div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-white/55">
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">Strategy</div>
          <div className="mt-0.5 tabular-nums text-white/80">v{agent.strategyVersion}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">Trades</div>
          <div className="mt-0.5 tabular-nums text-white/80">{agent.recentTrades}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">Tick</div>
          <div className="mt-0.5 tabular-nums text-white/80">{fmtAge(agent.ageSeconds)}</div>
        </div>
      </div>

      {agent.openTrade && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-200">
          <span className="size-1 rounded-full bg-amber-300" />
          position open
        </div>
      )}

      {agent.lastReflection && agent.lastReflection.change.field && (
        <div className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] text-white/55">
          <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">Last reflection</div>
          <div className="mt-1 truncate text-white/75">
            {agent.lastReflection.change.field}: {String(agent.lastReflection.change.from)} → {String(agent.lastReflection.change.to)}
          </div>
          <div className="mt-0.5 text-[10px] text-white/45">
            score {fmtScore(agent.lastReflection.score.score)} · {agent.lastReflection.mode}
          </div>
        </div>
      )}
    </div>
  );
}

export function TradingAgentsPanel() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/trading/agents', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) setAgents(data.agents);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'fetch failed');
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (err) {
    return (
      <div className="mx-12 mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
        Trading agents unreachable: {err}
      </div>
    );
  }

  if (!agents) {
    return (
      <div className="mx-12 mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-12 mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
      {agents.map((a) => (
        <AgentTile key={a.asset} agent={a} />
      ))}
    </div>
  );
}
