import type { WhaleFlowItem } from '@/lib/olympus/types';

type WhaleHuntingProps = {
  flow: WhaleFlowItem[];
};

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function timeLabel(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function WhaleHunting({ flow }: WhaleHuntingProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">🐋 Whale Hunting</h2>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/34">Artemis live flow board</p>
        </div>
        {flow.length > 15 ? (
          <span className="rounded-full border border-white/[0.12] px-2.5 py-1 text-[10px] text-white/45">
            +{flow.length - 15} more
          </span>
        ) : null}
      </div>

      {flow.length === 0 ? (
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-sm text-white/34">
          Scanning the deep...
        </div>
      ) : (
        <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
          {flow.slice(0, 15).map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold tracking-wide text-white">{item.ticker}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      item.right === 'call'
                        ? 'border-emerald-300/35 bg-emerald-400/10 text-emerald-200'
                        : 'border-rose-300/35 bg-rose-400/10 text-rose-200'
                    }`}>
                      {item.right}
                    </span>
                    {item.notable ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> : null}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-white/38">
                    {item.type} / {item.expiry} / ${item.strike}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-white/80">{money(item.premium)}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/34">{timeLabel(item.ts)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/48">
                <span>{item.size.toLocaleString()} contracts</span>
                <span className="uppercase tracking-[0.14em]">{item.side}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
