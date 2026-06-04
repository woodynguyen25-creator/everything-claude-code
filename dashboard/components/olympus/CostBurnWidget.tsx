'use client';

import { useLiveResource } from '@/lib/useLiveResource';

interface CostState {
  monthly_cap: number;
  mtd_total: number;
  mtd_pct: number;
  daily_burn_30d: number[];
  forecast_eom: number;
  status: 'green' | 'amber' | 'red';
}

function Skeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
      <div className="h-3 w-24 rounded bg-white/[0.07] shimmer" />
      <div className="mt-3 h-8 w-32 rounded bg-white/[0.07] shimmer" />
      <div className="mt-4 h-2 w-full rounded bg-white/[0.07] shimmer" />
      <div className="mt-4 flex h-6 gap-[2px]">
        {Array.from({ length: 16 }).map((_, index) => (
          <div key={index} className="flex-1 rounded-sm bg-white/[0.06] shimmer" />
        ))}
      </div>
    </div>
  );
}

export function CostBurnWidget() {
  // Silent fallback keeps the mock-first UI stable; errors leave `cost` null -> Skeleton.
  const { data: cost } = useLiveResource<CostState>('/api/cost/state', { intervalMs: 30_000 });

  if (!cost) return <Skeleton />;

  const color =
    cost.status === 'green' ? '#10B981' :
      cost.status === 'amber' ? '#F59E0B' :
        '#EF4444';

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 backdrop-blur">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/44">
        <span>💰</span>
        <span>Cost Burn</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold tracking-wide text-white">${cost.mtd_total.toFixed(2)}</span>
        <span className="text-sm text-white/40">/ ${cost.monthly_cap.toFixed(0)}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${Math.min(100, cost.mtd_pct * 100)}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
        <span>{(cost.mtd_pct * 100).toFixed(0)}%</span>
        <span>Forecast: ${cost.forecast_eom.toFixed(2)}</span>
      </div>
      <div className="mt-3 flex h-6 items-end gap-[2px]">
        {cost.daily_burn_30d.slice(-30).map((value, index) => (
          <div
            key={index}
            className="flex-1 rounded-sm opacity-60 transition-opacity hover:opacity-100"
            style={{ height: `${Math.min(100, value * 100)}%`, backgroundColor: color }}
            title={`Day ${index + 1}: $${value.toFixed(3)}`}
          />
        ))}
      </div>
    </div>
  );
}
