'use client';

import { useEffect, useState, useCallback } from 'react';
import type { UnusualOptionsData, UnusualRow } from '@/app/api/trading/unusual/route';

function formatPremium(k: number): string {
  if (k >= 1000) return `$${(k / 1000).toFixed(1)}M`;
  return `$${k.toFixed(0)}K`;
}

function formatExp(exp: string): string {
  const d = new Date(exp + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAge(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function RowItem({ row }: { row: UnusualRow }) {
  const isCall = row.type === 'CALL';
  const isBullish = row.signal === 'BULLISH';

  return (
    <div className="grid grid-cols-[3rem_3.5rem_4.5rem_4rem_minmax(0,1fr)_4.5rem_3.5rem] items-center gap-x-3 rounded px-3 py-[5px] transition-colors hover:bg-bg-hover cursor-default">
      {/* Symbol */}
      <span className="font-mono text-[11px] font-semibold text-text-primary">{row.symbol}</span>

      {/* Type badge */}
      <span
        className={`inline-flex items-center justify-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider ${
          isCall
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-rose-500/15 text-rose-400'
        }`}
      >
        {row.type}
      </span>

      {/* Strike */}
      <span className="font-mono text-[11px] tabular-nums text-text-primary">${row.strike.toFixed(0)}</span>

      {/* Expiry */}
      <span className="font-mono text-[10px] text-text-muted">{formatExp(row.exp)}</span>

      {/* Volume bar */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-[10px] tabular-nums text-text-secondary">{row.volume.toLocaleString()}</span>
        <div className="flex-1 h-[3px] rounded-full bg-bg-deep overflow-hidden">
          <div
            className={`h-full rounded-full ${isCall ? 'bg-emerald-500' : 'bg-rose-500'}`}
            style={{ width: `${Math.min(100, (row.voiRatio / 20) * 100)}%` }}
          />
        </div>
      </div>

      {/* Premium */}
      <span
        className={`font-mono text-[11px] font-semibold tabular-nums text-right ${
          row.premiumK >= 1000 ? 'text-rune-gold' : 'text-text-primary'
        }`}
      >
        {formatPremium(row.premiumK)}
      </span>

      {/* Signal */}
      <span
        className={`text-right font-mono text-[9px] font-bold tracking-wider ${
          isBullish ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {isBullish ? '▲ BULL' : '▼ BEAR'}
      </span>
    </div>
  );
}

export default function UnusualOptionsPanel() {
  const [data, setData] = useState<UnusualOptionsData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/trading/unusual', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } catch {
      // silent — show stale or empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(timer);
  }, [refresh]);

  const rows: UnusualRow[] = data?.rows ?? [];
  const age = formatAge(data?.generatedAt ?? null);

  const visible = rows.slice(0, 5);

  return (
    <section className="mb-0 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
      <header className="flex items-center justify-between border-b border-border-subtle/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span className="text-rune text-[10px] tracking-[0.3em] text-text-muted">OPTIONS FLOW</span>
          <span className="rounded-sm bg-bg-deep px-1.5 py-0.5 font-mono text-[9px] text-text-muted">SPY · IWM · top 5</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] text-text-muted">{age}</span>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded border border-border-subtle px-2 py-0.5 font-mono text-[9px] text-text-muted transition-colors hover:border-emerald-400 hover:text-emerald-400 disabled:opacity-40 cursor-pointer"
          >
            {loading ? '...' : 'SCAN'}
          </button>
        </div>
      </header>

      <div className="divide-y divide-border-subtle/10 px-1 py-1">
        {loading && visible.length === 0 ? (
          <div className="py-4 text-center font-mono text-[11px] text-text-muted">Scanning...</div>
        ) : visible.length === 0 ? (
          <div className="py-4 text-center font-mono text-[11px] text-text-muted">
            No signals.{' '}
            <button onClick={refresh} className="text-rune-gold underline cursor-pointer">
              Run scan
            </button>
          </div>
        ) : (
          visible.map((row, i) => <RowItem key={`${row.symbol}-${row.type}-${row.strike}-${row.exp}-${i}`} row={row} />)
        )}
      </div>

      {rows.length > 0 && (
        <div className="border-t border-border-subtle/20 px-4 py-2 text-[9px] text-text-muted">
          Showing 5 of {rows.length} signals · V/OI ≥ 0.3 · min $50K premium
        </div>
      )}
    </section>
  );
}
