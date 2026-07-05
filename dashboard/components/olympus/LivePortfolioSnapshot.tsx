'use client';

import { useLiveResource } from '@/lib/useLiveResource';
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

// The RH bridge sometimes returns numerics as strings (or omits them) — coerce
// and validate before formatting so the UI never renders "$NaN".
function num(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function fmt(value: unknown) {
  const n = num(value);
  if (n === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function PnlChip({ value }: { value: number }) {
  const n = num(value);
  if (n === null) return <span className="font-mono text-[11px] text-text-muted">—</span>;
  const up = n >= 0;
  return (
    <span className={`font-mono text-[11px] font-medium ${up ? 'text-emerald' : 'text-blood'}`}>
      {up ? '+' : ''}{fmt(n)}
    </span>
  );
}

export function LivePortfolioSnapshot() {
  const { data: raw, loading, error } = useLiveResource<RhPortfolio>('/api/portfolio/robinhood/state', {
    intervalMs: 60_000,
  });
  // not_configured is a valid (non-error) payload status — keep it distinct from a fetch error.
  const status: 'loading' | 'ready' | 'not_configured' | 'error' = loading
    ? 'loading'
    : error
      ? 'error'
      : raw?.status === 'not_configured'
        ? 'not_configured'
        : raw
          ? 'ready'
          : 'loading';
  const data = status === 'ready' ? raw : null;

  const topMovers = [...(data?.stocks ?? [])]
    .filter((pos) => num(pos.unrealized_pnl) !== null)
    .sort((a, b) => Math.abs(num(b.unrealized_pnl) ?? 0) - Math.abs(num(a.unrealized_pnl) ?? 0))
    .slice(0, 4);

  const dayChange = num(data?.daily_change) ?? 0;
  const dayPct = (num(data?.daily_change_pct) ?? 0) * 100;
  const isLive = status === 'ready' && data != null;

  return (
    <section className="rounded-2xl border border-border-subtle bg-bg-panel/85 p-4 shadow-panel backdrop-blur-xl">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full transition-colors ${isLive ? 'bg-emerald shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-white/[0.12]'}`} />
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-text-primary">Personal Robinhood</h2>
        {isLive && (
          <span className="ml-auto rounded-full border border-emerald/30 bg-emerald/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-emerald">
            LIVE
          </span>
        )}
      </div>

      {status === 'loading' && (
        <div className="py-3 text-[11px] italic text-text-muted">Reaching into the vault…</div>
      )}

      {(status === 'not_configured' || status === 'error') && (
        <div className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle p-4 text-center">
          <span className="text-lg">🔑</span>
          <p className="text-[11px] italic leading-relaxed text-text-muted">
            Awaiting RH credentials.
            <br />
            <span className="font-mono text-text-secondary">RH_USER · RH_PASS · RH_TOTP_SEED</span>
          </p>
        </div>
      )}

      {isLive && data && (
        <div className="space-y-2.5">
          {/* Equity hero */}
          <div className="rounded-xl border border-rune-gold/20 bg-rune-gold/5 px-3 py-2.5">
            <div className="text-[9px] uppercase tracking-[0.28em] text-text-muted">Total Portfolio</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <NumberFlow
                value={num(data.equity) ?? 0}
                format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2 }}
                className="font-mono text-xl font-semibold text-rune-gold tabular-nums"
              />
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <PnlChip value={dayChange} />
              <span className={`text-[10px] ${dayChange >= 0 ? 'text-emerald/70' : 'text-blood/70'}`}>
                ({dayChange >= 0 ? '+' : ''}{dayPct.toFixed(2)}%) today
              </span>
            </div>
          </div>

          {/* Breakdown row */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg border border-border-subtle bg-white/[0.02] px-2 py-1.5 text-center">
              <div className="text-[8px] uppercase tracking-[0.2em] text-text-muted">Stocks</div>
              <div className="mt-0.5 font-mono text-[11px] text-text-secondary">{fmt(data.market_value)}</div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-white/[0.02] px-2 py-1.5 text-center">
              <div className="text-[8px] uppercase tracking-[0.2em] text-text-muted">Options</div>
              <div className="mt-0.5 font-mono text-[11px] text-text-secondary">{fmt(data.options_value ?? 0)}</div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-white/[0.02] px-2 py-1.5 text-center">
              <div className="text-[8px] uppercase tracking-[0.2em] text-text-muted">Cash</div>
              <div className="mt-0.5 font-mono text-[11px] text-text-secondary">{fmt(data.buying_power)}</div>
            </div>
          </div>

          {/* Agentic account (Olympus Real) */}
          {data.accounts?.agentic && (
            <div className="flex items-center justify-between rounded-lg border border-ember/15 bg-ember/5 px-3 py-2">
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-ember/70">Olympus Agentic</div>
                <div className="mt-0.5 text-[11px] text-text-secondary">
                  {(num(data.accounts.agentic.balance) ?? 0) === 0
                    ? 'Empty — ready for real trades'
                    : fmt(data.accounts.agentic.balance ?? 0)}
                </div>
              </div>
              <span className="rounded-full border border-ember/25 bg-ember/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.16em] text-ember">
                AI ACCOUNT
              </span>
            </div>
          )}

          {/* Top movers */}
          {topMovers.length > 0 && (
            <div>
              <div className="mb-1.5 text-[9px] uppercase tracking-[0.24em] text-text-muted">Top Movers</div>
              <div className="space-y-1">
                {topMovers.map((pos, i) => (
                  <div
                    key={`${pos.ticker}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-border-subtle bg-white/[0.015] px-2.5 py-1.5 transition-colors hover:bg-white/[0.03]"
                  >
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-text-primary">{pos.ticker}</span>
                      <span className="ml-1.5 font-mono text-[9px] text-text-muted">
                        {num(pos.quantity) ?? '—'}× @{fmt(pos.avg_cost)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-text-muted">{fmt(pos.last_price)}</span>
                      <PnlChip value={pos.unrealized_pnl} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sync time */}
          {data.ts && (
            <div className="flex items-center justify-between text-[9px] text-text-muted/60">
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
