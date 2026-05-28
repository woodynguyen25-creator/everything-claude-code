import type { MacroBrief } from '@/lib/olympus/types';

type MacroPulseProps = {
  brief: MacroBrief | null;
};

function formatTime(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MacroPulse({ brief }: MacroPulseProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">🌍 Macro Pulse</h2>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/34">Zeus daily brief</p>
      </div>

      {!brief ? (
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-sm text-white/34">
          Zeus is meditating...
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/34">Regime</div>
              <div className="mt-1 font-mono text-sm text-white/82">{brief.regime}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/34">VIX</div>
              <div className="mt-1 font-mono text-sm text-white/82">{brief.vix.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/34">FOMC</div>
              <div className="mt-1 font-mono text-sm text-white/82">{brief.fomc_distance_days}d</div>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-white/72">{brief.brief}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {brief.key_levels.map((level) => (
              <span
                key={level}
                className="rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/54"
              >
                {level}
              </span>
            ))}
          </div>

          <div className="mt-4 text-[10px] uppercase tracking-[0.16em] text-white/34">
            Updated {formatTime(brief.updated_ts)}
          </div>
        </div>
      )}
    </section>
  );
}
