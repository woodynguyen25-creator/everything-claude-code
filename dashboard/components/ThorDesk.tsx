'use client';

import { useEffect, useState } from 'react';

interface ChildAgent {
  id: 'magni' | 'modi' | 'thrud';
  name: string;
  asset: 'BTC' | 'ETH' | 'SPY';
  parent: 'thor';
  lore: string;
  price: number | null;
  rsi: number | null;
  heartbeatAgeSec: number | null;
  strategyVersion: string | null;
  threshold: number | null;
  stopLossPct: number | null;
  takeProfitPct: number | null;
  openTrade: {
    entryTs: number;
    entryPrice: number;
    sizeR: number;
    unrealizedPnlPct: number;
    holdMinutes: number;
  } | null;
  trades24h: number;
  pnl24hPct: number;
  winRate24h: number | null;
  lastReflection: { ts: number; field: string | null; reason: string } | null;
}

const SIGIL: Record<ChildAgent['id'], string> = { magni: '⚒', modi: '⚔', thrud: '⚡' };
const ACCENT: Record<ChildAgent['id'], string> = {
  magni: 'from-amber-400/30 via-orange-500/15 ring-amber-300/35',
  modi: 'from-sky-400/30 via-indigo-500/15 ring-sky-300/35',
  thrud: 'from-violet-400/30 via-fuchsia-500/15 ring-violet-300/35',
};

function fmtPrice(asset: string, price: number | null): string {
  if (price === null) return '—';
  if (asset === 'BTC') return `$${Math.round(price).toLocaleString()}`;
  if (asset === 'ETH') return `$${Math.round(price).toLocaleString()}`;
  return `$${price.toFixed(2)}`;
}

function fmtHold(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function ChildCard({ child }: { child: ChildAgent }) {
  const stale = child.heartbeatAgeSec !== null && child.heartbeatAgeSec > 120;
  const hasOpen = !!child.openTrade;
  const pnl = child.openTrade?.unrealizedPnlPct ?? null;
  const pnlColor = pnl === null ? 'text-white/60' : pnl >= 0 ? 'text-emerald-300' : 'text-red-300';

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent p-5 shadow-[0_10px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT[child.id]} ring-1 ring-inset`}>
            <span className="text-xl text-white/95">{SIGIL[child.id]}</span>
          </div>
          <div>
            <div className="text-base font-medium text-white">{child.name}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{child.asset} · son of Thor</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-medium tabular-nums text-white/95">{fmtPrice(child.asset, child.price)}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            {stale ? `stale ${child.heartbeatAgeSec}s` : 'live'}
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] italic text-white/55">{child.lore}</div>

      {hasOpen ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.18em] text-emerald-200/65">Open position</span>
            <span className={`text-base font-medium tabular-nums ${pnlColor}`}>
              {pnl !== null && pnl >= 0 ? '+' : ''}{pnl?.toFixed(2)}%
            </span>
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <div className="text-[9px] text-white/35">Entry</div>
              <div className="text-white/85">{fmtPrice(child.asset, child.openTrade!.entryPrice)}</div>
            </div>
            <div>
              <div className="text-[9px] text-white/35">Size</div>
              <div className="text-white/85">{child.openTrade!.sizeR}R</div>
            </div>
            <div>
              <div className="text-[9px] text-white/35">Hold</div>
              <div className="text-white/85">{fmtHold(child.openTrade!.holdMinutes)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-white/50">
          No open position — waiting for signal (RSI {child.rsi?.toFixed(1) ?? '—'} · entry threshold {child.threshold ?? '—'})
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.05] pt-3 text-[11px]">
        <div>
          <div className="text-[9px] uppercase tracking-[0.15em] text-white/35">24h trades</div>
          <div className="text-white/85">{child.trades24h}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.15em] text-white/35">24h pnl</div>
          <div className={child.pnl24hPct >= 0 ? 'text-emerald-300' : 'text-red-300'}>
            {child.pnl24hPct >= 0 ? '+' : ''}{child.pnl24hPct.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.15em] text-white/35">24h win</div>
          <div className="text-white/85">{child.winRate24h !== null ? `${Math.round(child.winRate24h * 100)}%` : '—'}</div>
        </div>
      </div>

      <div className="mt-3 border-t border-white/[0.05] pt-3 text-[10px] text-white/50">
        <span className="text-[9px] uppercase tracking-[0.15em] text-white/35">strategy</span>{' '}
        v{child.strategyVersion ?? '?'} · SL {child.stopLossPct ?? '?'}% · TP {child.takeProfitPct ?? '?'}%
        {child.lastReflection && (
          <span> · last reflect: {child.lastReflection.field || 'hold'}</span>
        )}
      </div>
    </div>
  );
}

export function ThorDesk() {
  const [children, setChildren] = useState<ChildAgent[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/thor', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) setChildren(data.children);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'fetch failed');
      }
    }
    load();
    const id = setInterval(load, 20_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (err) {
    return <div className="mx-12 mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">Thor desk unreachable: {err}</div>;
  }
  if (!children) {
    return (
      <div className="mx-12 mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent" />)}
      </div>
    );
  }

  const openCount = children.filter((c) => c.openTrade).length;
  const totalUnreal = children.reduce((sum, c) => sum + (c.openTrade?.unrealizedPnlPct ?? 0), 0);

  return (
    <>
      <div className="mx-12 mb-4 flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.02] px-5 py-3 text-[11px] text-white/55 backdrop-blur">
        <div className="flex items-center gap-4">
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/35">Thor · Mjölnir Council</span>
          <span><b className="text-white/85">{openCount}</b> open</span>
          {openCount > 0 && (
            <span className={totalUnreal >= 0 ? 'text-emerald-300' : 'text-red-300'}>
              unrealized {totalUnreal >= 0 ? '+' : ''}{totalUnreal.toFixed(2)}% combined
            </span>
          )}
        </div>
        <span className="text-white/40">3 children · 1m loop · 6h reflection</span>
      </div>
      <div className="mx-12 mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {children.map((c) => <ChildCard key={c.id} child={c} />)}
      </div>
    </>
  );
}
