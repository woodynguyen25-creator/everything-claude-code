'use client';

import { useEffect, useState } from 'react';

interface RhPosition {
  ticker: string;
  quantity: number;
  avg_cost: number;
  last_price: number;
  market_value: number;
  unrealized_pnl: number;
}

interface RhOptionPosition {
  ticker: string;
  right: string;
  strike: number;
  expiry: string;
  quantity: number;
  avg_cost: number;
  unrealized_pnl: number;
}

interface RhPortfolio {
  status: 'ok' | 'not_configured';
  ts: string | null;
  equity: number;
  buying_power: number;
  cash: number;
  market_value: number;
  daily_change: number;
  daily_change_pct: number;
  stocks: RhPosition[];
  options: RhOptionPosition[];
  total_positions: number;
  message?: string;
}

function fmt(value: number, opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  }).format(value);
}

function PnlText({ value, className = '' }: { value: number; className?: string }) {
  const color = value >= 0 ? 'text-emerald-300' : 'text-rose-300';
  return (
    <span className={`font-mono ${color} ${className}`}>
      {value >= 0 ? '+' : ''}{fmt(value)}
    </span>
  );
}

export function LivePortfolioSnapshot() {
  const [data, setData] = useState<RhPortfolio | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_configured' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/portfolio/robinhood/state')
      .then((r) => r.json() as Promise<RhPortfolio>)
      .then((d) => {
        if (d.status === 'not_configured') {
          setStatus('not_configured');
        } else {
          setData(d);
          setStatus('ready');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  // Sort stocks by absolute unrealized PnL for top movers
  const topMovers = [...(data?.stocks ?? [])]
    .sort((a, b) => Math.abs(b.unrealized_pnl) - Math.abs(a.unrealized_pnl))
    .slice(0, 5);

  const isLive = status === 'ready' && data;
  const dayChange = data?.daily_change ?? 0;
  const dayChangePct = (data?.daily_change_pct ?? 0) * 100;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full transition-colors ${
            isLive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-white/12'
          }`}
        />
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">
          Personal Robinhood
        </h2>
        {isLive && (
          <span className="ml-auto rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-emerald-300">
            LIVE
          </span>
        )}
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <div className="py-3 text-[11px] italic text-white/30">Reaching into the vault…</div>
      )}

      {/* Not configured — awaiting credentials */}
      {(status === 'not_configured' || status === 'error') && (
        <div className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.06] p-4 text-center">
          <span className="text-lg">🔑</span>
          <p className="text-[11px] italic leading-relaxed text-white/38">
            Awaiting RH credentials.
            <br />
            Add <span className="font-mono text-white/55">RH_USER · RH_PASS · RH_TOTP_SEED</span>
            <br />
            to <span className="font-mono text-white/55">/home/hermes/olympus/.env</span>
          </p>
        </div>
      )}

      {/* Live data */}
      {isLive && data && (
        <div className="space-y-2.5">
          {/* Equity hero */}
          <div className="rounded-xl border border-[#C9A961]/20 bg-[#C9A961]/5 px-3 py-2.5">
            <div className="text-[9px] uppercase tracking-[0.28em] text-white/40">Total Equity</div>
            <div className="mt-0.5 font-mono text-xl font-semibold text-[#C9A961]">
              {fmt(data.equity)}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <PnlText value={dayChange} className="text-[11px]" />
              <span className={`text-[10px] ${dayChange >= 0 ? 'text-emerald-300/70' : 'text-rose-300/70'}`}>
                ({dayChange >= 0 ? '+' : ''}{dayChangePct.toFixed(2)}%) today
              </span>
            </div>
          </div>

          {/* Buying power + positions count */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">Buying Power</div>
              <div className="mt-0.5 font-mono text-xs text-white/85">{fmt(data.buying_power)}</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">Positions</div>
              <div className="mt-0.5 font-mono text-xs text-white/85">
                {data.stocks.length}
                {data.options.length > 0 && (
                  <span className="text-white/40"> + {data.options.length} opts</span>
                )}
              </div>
            </div>
          </div>

          {/* Top movers */}
          {topMovers.length > 0 && (
            <div>
              <div className="mb-1.5 text-[9px] uppercase tracking-[0.24em] text-white/30">
                Top Movers
              </div>
              <div className="space-y-1">
                {topMovers.map((pos) => (
                  <div
                    key={pos.ticker}
                    className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-2.5 py-1.5"
                  >
                    <div>
                      <span className="font-mono text-[11px] font-medium text-white/85">
                        {pos.ticker}
                      </span>
                      <span className="ml-1.5 text-[9px] text-white/35">
                        {pos.quantity}× @ {fmt(pos.avg_cost)}
                      </span>
                    </div>
                    <PnlText value={pos.unrealized_pnl} className="text-[11px]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staleness indicator */}
          {data.ts && (
            <div className="text-right text-[9px] text-white/22">
              synced{' '}
              {new Date(data.ts).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZone: 'America/Chicago',
              })}{' '}
              CT
            </div>
          )}
        </div>
      )}
    </section>
  );
}
