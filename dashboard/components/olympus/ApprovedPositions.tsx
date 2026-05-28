import { PositionRow } from '@/components/olympus/PositionRow';
import type { Decision } from '@/lib/olympus/types';

type ApprovedPositionsProps = {
  decisions: Decision[];
};

export function ApprovedPositions({ decisions }: ApprovedPositionsProps) {
  // Find the single highest-conviction decision — only it gets the BorderBeam
  const topId = decisions.reduce<string | null>((best, d) => {
    if (!best) return d.decision_id;
    const bestConviction = decisions.find((x) => x.decision_id === best)?.conviction ?? 0;
    return d.conviction > bestConviction ? d.decision_id : best;
  }, null);

  return (
    <section className="flex flex-col rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] p-5 shadow-[0_16px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h2 className="text-base font-semibold uppercase tracking-[0.24em] text-[#C9A961]">
              Active Positions
            </h2>
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/34">
            Anubis-approved · click for full council read
          </p>
        </div>
        <span className="rounded-full border border-[#C9A96155] bg-[#C9A96112] px-3 py-1 font-mono text-xs text-[#C9A961]">
          {decisions.length}
        </span>
      </div>

      {decisions.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-sm text-white/34">
          The council sits in silence — no positions are open.
        </div>
      ) : (
        <>
          <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-3 text-[9px] uppercase tracking-[0.18em] text-white/30">
            <span>Position</span>
            <span>Strike</span>
            <span>Exp</span>
            <span title="Zeus · Apollo · Athena · Ares · Loki">Council</span>
            <span>Status</span>
          </div>
          <div
            className="flex-1 space-y-1.5 overflow-y-auto pr-1"
            style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '420px', scrollbarWidth: 'thin' }}
          >
            {decisions.map((decision) => (
              <PositionRow
                key={decision.decision_id}
                decision={decision}
                isTopConviction={decision.decision_id === topId}
                isLive={false}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
