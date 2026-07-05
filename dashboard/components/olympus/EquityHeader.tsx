'use client';

import { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { CostBurnWidget } from '@/components/olympus/CostBurnWidget';
import { EdgeBarWidget } from '@/components/olympus/EdgeBarWidget';
import { EquitySparkline } from '@/components/olympus/EquitySparkline';
import type { OlympusState } from '@/lib/olympus/types';

type EquityMode = 'paper' | 'real' | 'both';
const STORAGE_KEY = 'olympus.equity.mode';

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type EquityHeaderProps = {
  state: OlympusState;
};

export function EquityHeader({ state }: EquityHeaderProps) {
  const [mode, setMode] = useState<EquityMode>('both');
  const [rhAvailable, setRhAvailable] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'paper' || saved === 'real' || saved === 'both') {
      setMode(saved as EquityMode);
    }
  }, []);

  useEffect(() => {
    fetch('/api/portfolio/robinhood/state', { method: 'HEAD' })
      .then((r) => setRhAvailable(r.ok))
      .catch(() => setRhAvailable(false));
  }, []);

  function selectMode(m: EquityMode) {
    setMode(m);
    localStorage.setItem(STORAGE_KEY, m);
  }

  const pnl = state.current_equity - state.starting_equity;
  const pct = pnl / state.starting_equity;
  const isGreen = pnl >= 0;
  const showPaper = mode !== 'real';
  // Mock/demo fallback — the paper figure isn't from live paper-trading results.
  const isSample = state.equity_source === 'sample';

  return (
    <header className="rounded-2xl border border-border-subtle bg-bg-panel/85 p-4 shadow-panel backdrop-blur-xl">
      <div className="grid min-h-[140px] grid-cols-1 gap-4 xl:grid-cols-[0.75fr_1.1fr_0.9fr_0.85fr]">
        <div className="rounded-2xl border border-border-subtle bg-white/[0.025] p-5">
          {/* Title + mode toggle */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="text-[10px] uppercase tracking-[0.28em] text-text-muted">Olympus Fund</div>
              {isSample && (
                <span
                  title="Demo figures — no live fund data yet"
                  className="rounded-full border border-ember/40 bg-ember/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-ember"
                >
                  Demo
                </span>
              )}
            </div>
            <div className="flex items-center gap-px rounded-full border border-border-subtle bg-white/[0.02] p-0.5">
              {(['paper', 'real', 'both'] as EquityMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMode(m)}
                  className={`rounded-full px-2.5 py-0.5 text-[8px] uppercase tracking-[0.14em] transition-all ${
                    mode === m
                      ? 'bg-rune-gold font-semibold text-bg-deep'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Animated equity number — @number-flow/react per-digit spring animation */}
          <div className="mt-3">
            {showPaper ? (
              <NumberFlow
                value={state.current_equity}
                format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2 }}
                className="font-mono text-4xl font-semibold tracking-tight text-text-primary tabular-nums sm:text-5xl xl:text-6xl"
              />
            ) : (
              <span className="font-mono text-2xl italic text-text-muted/60">
                {rhAvailable ? 'Loading…' : '— real pending'}
              </span>
            )}
          </div>

          {/* P&L */}
          <div className={`mt-2 font-mono text-sm ${isGreen ? 'text-emerald' : 'text-blood'}`}>
            {isGreen ? '+' : ''}
            {currency(pnl)} / {isGreen ? '+' : ''}
            {(pct * 100).toFixed(2)}%
          </div>

          {/* Net delta strip (both mode) */}
          {mode === 'both' && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[9px]">
              <span className={isGreen ? 'text-rune-gold' : 'text-blood'}>
                Paper {isGreen ? '+' : ''}{currency(pnl)} ({(pct * 100).toFixed(2)}%)
              </span>
              <span className="text-text-muted/40">·</span>
              <span className={rhAvailable ? 'text-emerald/70' : 'text-text-muted/60 italic'}>
                {rhAvailable ? 'Real syncing…' : 'Real sync pending Robinhood wire-up'}
              </span>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">
            <span className="rounded-full border border-border-subtle px-2 py-1">
              <NumberFlow value={state.open_positions_count} className="tabular-nums" /> open
            </span>
            <span className="rounded-full border border-border-subtle px-2 py-1">
              <NumberFlow
                value={state.total_unrealized_pnl}
                format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 0 }}
                className="tabular-nums"
              /> unrealized
            </span>
          </div>
          <div className="mt-3 text-[10px] text-text-muted/70 tracking-wide">
            ⚖️ Anubis chairs · ⚒️ Thor speaks · 🤴 LeBot reports
          </div>
        </div>

        <EquitySparkline points={state.equity_curve} />
        <EdgeBarWidget edgeBar={state.edge_bar} />
        <CostBurnWidget />
      </div>
    </header>
  );
}
