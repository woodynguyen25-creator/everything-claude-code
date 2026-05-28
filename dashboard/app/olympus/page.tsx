'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AgentLegend } from '@/components/olympus/AgentLegend';
import { DecisionQuadrants } from '@/components/olympus/DecisionQuadrants';
import { EquityHeader } from '@/components/olympus/EquityHeader';
import { DecisionDrawer } from '@/components/olympus/DecisionDrawer';
import mockState from '@/data/olympus-mock.json';
import type { Decision, OlympusState } from '@/lib/olympus/types';

const INITIAL_STATE = mockState as unknown as OlympusState;

function formatUpdated(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Flatten all decisions from all quadrants into a single lookup map. */
function buildDecisionMap(decisions: OlympusState['decisions']): Map<string, Decision> {
  const map = new Map<string, Decision>();
  for (const group of Object.values(decisions)) {
    for (const d of group as Decision[]) {
      map.set(d.decision_id, d);
    }
  }
  return map;
}

/** Inner component that reads searchParams (must be wrapped in Suspense) */
function OlympusInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<OlympusState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);

  const decisionId = searchParams.get('decision');
  const decisionMap = buildDecisionMap(state.decisions);
  const activeDecision = decisionId ? (decisionMap.get(decisionId) ?? null) : null;

  // Close drawer: strip the ?decision= param
  const handleClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('decision');
    const qs = params.toString();
    router.replace(qs ? `/olympus?${qs}` : '/olympus', { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/olympus/state', { cache: 'no-store' });
        if (!res.ok) throw new Error(`state ${res.status}`);
        const next = (await res.json()) as OlympusState;
        if (!cancelled) {
          setState(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'state unavailable');
      }
    }

    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <>
      {/* Main page */}
      <div className="relative min-h-screen overflow-hidden bg-[#0D0B1A] px-4 py-8 text-white sm:px-6 md:px-8 lg:px-10 xl:px-12">
        {/* Dot-grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
        {/* Blue top glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.18),_transparent_62%)]"
        />

        <main className="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-5">
          {/* Page header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.32em] text-white/42">
                Greek/Norse options council
              </div>
              <h1 className="mt-2 font-sans text-3xl font-semibold uppercase tracking-wide text-white md:text-4xl">
                Olympus Fund
              </h1>
            </div>
            <div className="text-right font-mono text-[11px] text-white/45">
              <div>Mock-first state / 30s polling</div>
              <div>Updated {formatUpdated(state.ts)}</div>
              {error ? (
                <div className="mt-1 text-amber-200">Using cached mock: {error}</div>
              ) : null}
            </div>
          </div>

          <EquityHeader state={state} />
          <AgentLegend agents={state.agents} />
          <DecisionQuadrants decisions={state.decisions} />
        </main>
      </div>

      {/* Decision detail drawer (portal-style, fixed) */}
      <DecisionDrawer decision={activeDecision} onClose={handleClose} />
    </>
  );
}

/** Outer page: wraps inner in Suspense as required by Next 14 useSearchParams */
export default function OlympusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0D0B1A] text-white/40">
          Loading...
        </div>
      }
    >
      <OlympusInner />
    </Suspense>
  );
}
