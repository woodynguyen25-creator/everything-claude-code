import { MarqueeFlow } from '@/components/twentyfirst/MarqueeFlow';
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
    <section className="rounded-2xl border border-border-subtle bg-bg-panel/85 p-4 shadow-panel backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-text-primary">🐋 Whale Hunting</h2>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted">Artemis live flow board</p>
        </div>
        {flow.length > 15 ? (
          <span className="rounded-full border border-border-subtle px-2.5 py-1 text-[10px] text-text-muted">
            +{flow.length - 15} more
          </span>
        ) : null}
      </div>

      {/* Marquee ticker tape between title and list */}
      {flow.length > 0 && <MarqueeFlow items={flow} />}

      {flow.length === 0 ? (
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-border-subtle text-sm text-text-muted">
          Scanning the deep...
        </div>
      ) : (
        <div className="mt-2 max-h-[340px] space-y-2 overflow-y-auto pr-1">
          {flow.slice(0, 15).map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border-subtle bg-white/[0.025] px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold tracking-wide text-text-primary">{item.ticker}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        item.right === 'call'
                          ? 'border-emerald-300/35 bg-emerald-400/10 text-emerald-200'
                          : 'border-rose-300/35 bg-rose-400/10 text-rose-200'
                      }`}
                    >
                      {item.right}
                    </span>
                    {item.notable ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> : null}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-text-muted">
                    {item.type} / {item.expiry} / ${item.strike}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-text-secondary">{money(item.premium)}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-text-muted">{timeLabel(item.ts)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-text-muted">
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
