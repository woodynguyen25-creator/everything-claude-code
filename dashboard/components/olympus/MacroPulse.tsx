import type { MacroBrief } from '@/lib/olympus/types';

type MacroPulseProps = {
  brief: MacroBrief | null;
  /** 'sample' = mock fallback content; renders a data-honesty badge. */
  source?: 'live' | 'sample';
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

export function MacroPulse({ brief, source = 'live' }: MacroPulseProps) {
  const isSample = source === 'sample';

  return (
    <section className="rounded-2xl border border-border-subtle bg-bg-panel/85 p-4 shadow-panel backdrop-blur-xl">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-text-primary">🌍 Macro Pulse</h2>
          {isSample && brief && (
            <span className="rounded-full border border-ember/40 bg-ember/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ember">
              Sample
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted">Zeus daily brief</p>
      </div>

      {!brief ? (
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border-subtle text-sm text-text-muted">
          Zeus is meditating...
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-white/[0.025] p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Regime</div>
              <div className="mt-1 font-mono text-sm text-text-primary">{brief.regime}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">VIX</div>
              <div className="mt-1 font-mono text-sm text-text-primary">{brief.vix.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">FOMC</div>
              <div className="mt-1 font-mono text-sm text-text-primary">{brief.fomc_distance_days}d</div>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-text-secondary">{brief.brief}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {brief.key_levels.map((level) => (
              <span
                key={level}
                className="rounded-full border border-border-subtle bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-text-muted"
              >
                {level}
              </span>
            ))}
          </div>

          <div className="mt-4 text-[10px] uppercase tracking-[0.16em] text-text-muted">
            Updated {formatTime(brief.updated_ts)}{isSample ? ' · sample data' : ''}
          </div>
        </div>
      )}
    </section>
  );
}
