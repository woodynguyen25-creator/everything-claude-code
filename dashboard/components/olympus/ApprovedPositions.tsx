import { DecisionCard } from '@/components/olympus/DecisionCard';
import type { Decision } from '@/lib/olympus/types';

type ApprovedPositionsProps = {
  decisions: Decision[];
};

export function ApprovedPositions({ decisions }: ApprovedPositionsProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] p-5 shadow-[0_16px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h2 className="text-base font-semibold uppercase tracking-[0.24em] text-[#C9A961]">
              Active Positions
            </h2>
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/34">
            Anubis-approved exposures
          </p>
        </div>
        <span className="rounded-full border border-[#C9A96155] bg-[#C9A96112] px-3 py-1 font-mono text-xs text-[#C9A961]">
          {decisions.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {decisions.map((decision) => (
          <DecisionCard key={decision.decision_id} decision={decision} />
        ))}
      </div>
    </section>
  );
}
