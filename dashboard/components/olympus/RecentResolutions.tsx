import type { Decision } from '@/lib/olympus/types';

type RecentResolutionsProps = {
  decisions: Decision[];
};

function formatTime(ts: string | null) {
  if (!ts) return '--';
  return new Date(ts).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function outcomeTone(decision: Decision) {
  if (decision.status === 'win') return 'border-emerald-300/35 bg-emerald-400/8 text-emerald-200';
  if (decision.status === 'loss') return 'border-rose-300/35 bg-rose-400/8 text-rose-200';
  return 'border-white/15 bg-white/[0.05] text-white/60';
}

export function RecentResolutions({ decisions }: RecentResolutionsProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.78)] p-4 shadow-[0_12px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/86">Recent Resolutions</h2>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/34">Last 5</span>
      </div>
      <div className="grid gap-3 xl:grid-cols-5">
        {decisions.map((decision) => (
          <div
            key={decision.decision_id}
            className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-bold tracking-wide text-white">{decision.ticker}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${outcomeTone(decision)}`}>
                {decision.outcome ?? decision.status}
              </span>
            </div>
            <div className="mt-2 font-mono text-sm text-white/74">
              {decision.realized_r === null ? '--' : `${decision.realized_r > 0 ? '+' : ''}${decision.realized_r.toFixed(2)}R`}
            </div>
            <div className="mt-1 text-[11px] text-white/40">{formatTime(decision.resolved_at)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
