import { CostBurnWidget } from '@/components/olympus/CostBurnWidget';
import { EdgeBarWidget } from '@/components/olympus/EdgeBarWidget';
import { EquitySparkline } from '@/components/olympus/EquitySparkline';
import type { OlympusState } from '@/lib/olympus/types';

type EquityHeaderProps = {
  state: OlympusState;
};

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function EquityHeader({ state }: EquityHeaderProps) {
  const pnl = state.current_equity - state.starting_equity;
  const pct = pnl / state.starting_equity;
  const isGreen = pnl >= 0;

  return (
    <header className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <div className="grid min-h-[140px] grid-cols-1 gap-4 xl:grid-cols-[0.75fr_1.1fr_0.9fr_0.85fr]">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">Olympus Fund</div>
          <div className="mt-3 font-mono text-4xl font-semibold tracking-wide text-white">
            {currency(state.current_equity)}
          </div>
          <div className={`mt-3 font-mono text-sm ${isGreen ? 'text-emerald-200' : 'text-rose-200'}`}>
            {isGreen ? '+' : ''}
            {currency(pnl)} / {isGreen ? '+' : ''}
            {(pct * 100).toFixed(2)}%
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
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
