import { Suspense } from 'react';
import { DecisionCard } from '@/components/olympus/DecisionCard';
import type { OlympusState } from '@/lib/olympus/types';

type DecisionQuadrantsProps = {
  decisions: OlympusState['decisions'];
};

const QUADRANTS = [
  {
    key: 'candidates',
    title: 'Candidates',
    subtitle: 'pre-council',
    icon: '🕯️',
    accent: '#FBBF24',
  },
  {
    key: 'approved',
    title: 'Approved',
    subtitle: 'active positions',
    icon: '✅',
    accent: '#3B82F6',
  },
  {
    key: 'rejected',
    title: 'Rejected',
    subtitle: 'last 24h',
    icon: '❌',
    accent: '#F43F5E',
  },
  {
    key: 'resolved',
    title: 'Resolved',
    subtitle: 'last 20',
    icon: '📜',
    accent: '#10B981',
  },
] as const;

export function DecisionQuadrants({ decisions }: DecisionQuadrantsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
      {QUADRANTS.map((quadrant) => {
        const items = decisions[quadrant.key];
        return (
          <section
            key={quadrant.key}
            className="min-h-[520px] rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span>{quadrant.icon}</span>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">{quadrant.title}</h2>
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/38">{quadrant.subtitle}</div>
              </div>
              <span
                className="rounded-full border px-3 py-1 font-mono text-xs"
                style={{ borderColor: `${quadrant.accent}55`, color: quadrant.accent, background: `${quadrant.accent}10` }}
              >
                {items.length}
              </span>
            </div>
            <div className="grid max-h-[720px] gap-3 overflow-y-auto pr-1">
              {items.map((decision) => (
                <Suspense key={decision.decision_id} fallback={null}>
                  <DecisionCard decision={decision} />
                </Suspense>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
