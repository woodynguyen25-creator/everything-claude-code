'use client';

import { useEffect, useState } from 'react';

interface RobinhoodState {
  buying_power: number;
  day_pnl: number;
  day_pnl_pct: number;
  top_winners: Array<{ ticker: string; pnl: number }>;
  top_losers: Array<{ ticker: string; pnl: number }>;
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function LivePortfolioSnapshot() {
  const [data, setData] = useState<RobinhoodState | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    fetch('/api/portfolio/robinhood/state')
      .then((r) => {
        if (!r.ok) { setStatus('unavailable'); return null; }
        return r.json() as Promise<RobinhoodState>;
      })
      .then((d) => {
        if (d) { setData(d); setStatus('ready'); }
      })
      .catch(() => setStatus('unavailable'));
  }, []);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: status === 'ready' ? '#10B981' : 'rgba(255,255,255,0.12)' }}
        />
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">
          Live Portfolio
        </h2>
        {status === 'ready' && (
          <span className="ml-auto rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-emerald-300">
            RH
          </span>
        )}
      </div>

      {status === 'loading' && (
        <div className="py-2 text-[11px] italic text-white/30">Reaching into the vault…</div>
      )}

      {status === 'unavailable' && (
        <div className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.06] p-4 text-center">
          <span className="text-lg">🔑</span>
          <p className="text-[11px] italic leading-relaxed text-white/38">
            The vault is still being keyed.
            <br />
            Real-account sync awakens once Robinhood is bound.
          </p>
        </div>
      )}

      {status === 'ready' && data && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">Buying Power</span>
            <span className="font-mono text-xs text-white">{currency(data.buying_power)}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">Day P&amp;L</span>
            <span
              className={`font-mono text-xs ${data.day_pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}
            >
              {data.day_pnl >= 0 ? '+' : ''}
              {currency(data.day_pnl)} ({(data.day_pnl_pct * 100).toFixed(2)}%)
            </span>
          </div>

          {data.top_winners.slice(0, 3).map((w) => (
            <div
              key={`w-${w.ticker}`}
              className="flex items-center justify-between px-3 py-1 text-[10px]"
            >
              <span className="text-white/55">{w.ticker}</span>
              <span className="font-mono text-emerald-300">+{currency(w.pnl)}</span>
            </div>
          ))}
          {data.top_losers.slice(0, 3).map((l) => (
            <div
              key={`l-${l.ticker}`}
              className="flex items-center justify-between px-3 py-1 text-[10px]"
            >
              <span className="text-white/55">{l.ticker}</span>
              <span className="font-mono text-rose-300">{currency(l.pnl)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
