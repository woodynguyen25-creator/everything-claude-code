'use client';

import { useEffect, useState } from 'react';
import { CostBurnWidget } from '@/components/olympus/CostBurnWidget';
import { EdgeBarWidget } from '@/components/olympus/EdgeBarWidget';
import { EquitySparkline } from '@/components/olympus/EquitySparkline';
import { NumberTicker } from '@/components/twentyfirst/NumberTicker';
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

  return (
    <header className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <div className="grid min-h-[140px] grid-cols-1 gap-4 xl:grid-cols-[0.75fr_1.1fr_0.9fr_0.85fr]">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
          {/* Title + mode toggle */}
          <div className="flex items-start justify-between gap-2">
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">Olympus Fund</div>
            <div className="flex items-center gap-px rounded-full border border-white/[0.08] bg-white/[0.02] p-0.5">
              {(['paper', 'real', 'both'] as EquityMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMode(m)}
                  className={`rounded-full px-2.5 py-0.5 text-[8px] uppercase tracking-[0.14em] transition-all ${
                    mode === m
                      ? 'bg-[#C9A961] font-semibold text-[#0D0B1A]'
                      : 'text-white/35 hover:text-white/60'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Animated equity number */}
          <div className="mt-3">
            {showPaper ? (
              <NumberTicker
                value={state.current_equity}
                format={currency}
                className="font-mono text-4xl font-semibold tracking-wide text-white"
              />
            ) : (
              <span className="font-mono text-2xl italic text-white/25">
                {rhAvailable ? 'Loading…' : '— real pending'}
              </span>
            )}
          </div>

          {/* P&L */}
          <div className={`mt-2 font-mono text-sm ${isGreen ? 'text-emerald-200' : 'text-rose-200'}`}>
            {isGreen ? '+' : ''}
            {currency(pnl)} / {isGreen ? '+' : ''}
            {(pct * 100).toFixed(2)}%
          </div>

          {/* Net delta strip (both mode) */}
          {mode === 'both' && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[9px]">
              <span className={isGreen ? 'text-[#C9A961]' : 'text-rose-300'}>
                Paper {isGreen ? '+' : ''}{currency(pnl)} ({(pct * 100).toFixed(2)}%)
              </span>
              <span className="text-white/20">·</span>
              <span className={rhAvailable ? 'text-emerald-300/70' : 'text-white/25 italic'}>
                {rhAvailable ? 'Real syncing…' : 'Real sync pending Robinhood wire-up'}
              </span>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
            <span className="rounded-full border border-white/[0.08] px-2 py-1">
              {state.open_positions_count} open
            </span>
            <span className="rounded-full border border-white/[0.08] px-2 py-1">
              {currency(state.total_unrealized_pnl)} unrealized
            </span>
          </div>
          <div className="mt-3 text-[10px] text-white/30 tracking-wide">
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
