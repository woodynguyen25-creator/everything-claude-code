'use client';

import { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';

interface RhPosition {
  ticker: string;
  quantity: number;
  avg_cost: number;
  last_price: number;
  market_value: number;
  unrealized_pnl: number;
}

interface RhPortfolio {
  status: 'ok' | 'not_configured';
  source?: string;
  ts: string | null;
  equity: number;
  buying_power: number;
  cash: number;
  market_value: number;
  options_value?: number;
  crypto_value?: number;
  daily_change: number;
  daily_change_pct: number;
  stocks: RhPosition[];
  options: unknown[];
  total_positions: number;
  accounts?: {
    agentic?: { balance?: number; agentic_allowed?: boolean };
    personal?: { number_masked?: string };
  };
  message?: string;
}

function fmt(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function PnlChip({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`font-mono text-[11px] font-medium ${up ? 'text-emerald-300' : 'text-rose-300'}`}>
      {up ? '+' : ''}{fmt(value)}
    </span>
  );
}

export function LivePortfolioSnapshot() {
  const [data, setData] = useState<RhPortfolio | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_configured' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch('/api/portfolio/robinhood/state')
        .then((r) => r.json() as Promise<RhPortfolio>)
        .then((d) => {
          if (cancelled) return;
          if (d.status === 'not_configured') { setStatus('not_configured'); return; }
          setData(d);
          setStatus('ready');
        })
        .catch(() => { if (!cancelled) setStatus('error'); });
    }
    load();
    const t = window.setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const topMovers = [...(data?.stocks ?? [])]
    .sort((a, b) => Math.abs(b.unrealized_pnl) - Math.abs(a.unrealized_pnl))
    .slice(0, 4);

  const dayChange = data?.daily_change ?? 0;
  const dayPct = ((data?.daily_change_pct ?? 0) * 100);
  const isLive = status === 'ready' && data != null;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full transition-colors ${isLive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-white/12'}`} />
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">Personal Robinhood</h2>
        {isLive && (
          <span className="ml-auto rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-emerald-300">
            LIVE
          </span>
        )}
      </div>

      {status === 'loading' && (
        <div className="py-3 text-[11px] italic text-white/30">Reaching into the vault…</div>
      )}

      {(status === 'not_configured' || status === 'error') && (
        <div className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.06] p-4 text-center">
          <span className="text-lg">🔑</span>
          <p className="text-[11px] italic leading-relaxed text-white/38">
            Awaiting RH credentials.
            <br />
            <span className="font-mono text-white/55">RH_USER · RH_PASS · RH_TOTP_SEED</span>
          </p>
        </div>
      )}

      {isLive && data && (
        <div className="space-y-2.5">
          {/* Equity hero */}
          <div className="rounded-xl border border-[#C9A961]/20 bg-[#C9A961]/5 px-3 py-2.5">
            <div className="text-[9px] uppercase tracking-[0.28em] text-white/40">Total Portfolio</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <NumberFlow
                value={data.equity}
                format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2 }}
                className="font-mono text-xl font-semibold text-[#C9A961] tabular-nums"
              />
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <PnlChip value={dayChange} />
              <span className={`text-[10px] ${dayChange >= 0 ? 'text-emerald-300/70' : 'text-rose-300/70'}`}>
                ({dayChange >= 0 ? '+' : ''}{dayPct.toFixed(2)}%) today
              </span>
            </div>
          </div>

          {/* Breakdown row */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-center">
              <div className="text-[8px] uppercase tracking-[0.2em] text-white/30">Stocks</div>
              <div className="mt-0.5 font-mono text-[11px] text-white/75">{fmt(data.market_value)}</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-center">
              <div className="text-[8px] uppercase tracking-[0.2em] text-white/30">Options</div>
              <div className="mt-0.5 font-mono text-[11px] text-white/75">{fmt(data.options_value ?? 0)}</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-center">
              <div className="text-[8px] uppercase tracking-[0.2em] text-white/30">Cash</div>
              <div className="mt-0.5 font-mono text-[11px] text-white/75">{fmt(data.buying_power)}</div>
            </div>
          </div>

          {/* Agentic account (Olympus Real) */}
          {data.accounts?.agentic && (
            <div className="flex items-center justify-between rounded-lg border border-amber-400/15 bg-amber-400/5 px-3 py-2">
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-amber-300/70">Olympus Agentic</div>
                <div className="mt-0.5 text-[11px] text-white/55">
                  {(data.accounts.agentic.balance ?? 0) === 0
                    ? 'Empty — ready for real trades'
                    : fmt(data.accounts.agentic.balance ?? 0)}
                </div>
              </div>
              <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.16em] text-amber-300">
                AI ACCOUNT
              </span>
            </div>
          )}

          {/* Top movers */}
          {topMovers.length > 0 && (
            <div>
              <div className="mb-1.5 text-[9px] uppercase tracking-[0.24em] text-white/30">Top Movers</div>
              <div className="space-y-1">
                {topMovers.map((pos) => (
                  <div
                    key={pos.ticker}
                    className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-2.5 py-1.5 transition-colors hover:bg-white/[0.03]"
                  >
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-white/85">{pos.ticker}</span>
                      <span className="ml-1.5 font-mono text-[9px] text-white/35">
                        {pos.quantity}× @{fmt(pos.avg_cost)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-white/40">{fmt(pos.last_price)}</span>
                      <PnlChip value={pos.unrealized_pnl} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sync time */}
          {data.ts && (
            <div className="flex items-center justify-between text-[9px] text-white/20">
              <span className="font-mono">{data.source === 'robinhood-mcp' ? 'via RH MCP' : 'via API'}</span>
              <span>
                synced{' '}
                {new Date(data.ts).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: 'America/Chicago',
                })}{' '}
                CT
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
