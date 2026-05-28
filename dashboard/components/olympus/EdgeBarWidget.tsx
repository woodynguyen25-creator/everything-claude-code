import type { EdgeBar } from '@/lib/olympus/types';

type EdgeBarWidgetProps = {
  edgeBar: EdgeBar;
};

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function ProgressRow({
  label,
  current,
  target,
  formatter,
}: {
  label: string;
  current: number;
  target: number;
  formatter: (value: number) => string;
}) {
  const progress = Math.min(current / Math.max(target, 0.0001), 1);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
        <span className="uppercase tracking-[0.16em] text-white/45">{label}</span>
        <span className="font-mono text-white/75">
          {formatter(current)} / {formatter(target)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-300 to-amber-300"
          style={{ width: pct(progress) }}
        />
      </div>
    </div>
  );
}

export function EdgeBarWidget({ edgeBar }: EdgeBarWidgetProps) {
  const score =
    (Math.min(edgeBar.win_rate_30d / edgeBar.win_rate_target, 1) +
      Math.min(edgeBar.avg_r_30d / edgeBar.avg_r_target, 1) +
      Math.min(edgeBar.trade_count_30d / edgeBar.trade_count_target, 1)) /
    3;

  return (
    <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-white/40">Edge bar</div>
          <div className="mt-1 font-mono text-xl font-semibold tracking-wide text-white">{pct(score)}</div>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
            edgeBar.edge_bar_hit
              ? 'border-emerald-300/50 bg-emerald-400/10 text-emerald-200'
              : 'border-amber-300/35 bg-amber-300/10 text-amber-200'
          }`}
        >
          {edgeBar.edge_bar_hit ? 'Edge confirmed' : 'Gathering data'}
        </div>
      </div>
      <div className="space-y-3">
        <ProgressRow label="Win rate 30D" current={edgeBar.win_rate_30d} target={edgeBar.win_rate_target} formatter={(v) => pct(v)} />
        <ProgressRow label="Avg R 30D" current={edgeBar.avg_r_30d} target={edgeBar.avg_r_target} formatter={(v) => `${v.toFixed(2)}R`} />
        <ProgressRow label="Trade count" current={edgeBar.trade_count_30d} target={edgeBar.trade_count_target} formatter={(v) => String(Math.round(v))} />
      </div>
    </div>
  );
}
