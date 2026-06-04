'use client';

import { Suspense, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveResource } from '@/lib/useLiveResource';
import { ActionBoard } from '@/components/olympus/ActionBoard';
import { ApprovedPositions } from '@/components/olympus/ApprovedPositions';
import { AgentLegend } from '@/components/olympus/AgentLegend';
import { CouncilFlowBeam } from '@/components/olympus/CouncilFlowBeam';
import { DecisionDrawer } from '@/components/olympus/DecisionDrawer';
import { EquityHeader } from '@/components/olympus/EquityHeader';
import { MacroPulse } from '@/components/olympus/MacroPulse';
import { RecentResolutions } from '@/components/olympus/RecentResolutions';
import { TradingBotsStatus } from '@/components/olympus/TradingBotsStatus';
import { WhaleHunting } from '@/components/olympus/WhaleHunting';
import { LivePortfolioSnapshot } from '@/components/olympus/LivePortfolioSnapshot';
import { WinConfetti } from '@/components/olympus/WinConfetti';
import { OracleDrawer } from '@/components/oracle/OracleDrawer';
import { useWinConfetti } from '@/hooks/useWinConfetti';
import mockState from '@/data/olympus-mock.json';
import type { Decision, OlympusState } from '@/lib/olympus/types';

const INITIAL_STATE = mockState as OlympusState;

function formatUpdated(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildDecisionMap(decisions: OlympusState['decisions']): Map<string, Decision> {
  const map = new Map<string, Decision>();
  for (const group of Object.values(decisions)) {
    for (const decision of group as Decision[]) {
      map.set(decision.decision_id, decision);
    }
  }
  return map;
}

function OlympusInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error: networkError } = useLiveResource<OlympusState>('/api/olympus/state', {
    intervalMs: 30_000,
  });
  const state = data ?? INITIAL_STATE;
  const error = networkError;

  // Win confetti
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const { fire: fireConfetti } = useWinConfetti(confettiCanvasRef);
  const seenWinIds = useRef(new Set<string>());
  const isFirstLoad = useRef(true);

  const decisionId = searchParams.get('decision');
  const decisionMap = buildDecisionMap(state.decisions);
  const activeDecision = decisionId ? (decisionMap.get(decisionId) ?? null) : null;

  const handleClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('decision');
    const qs = params.toString();
    router.replace(qs ? `/olympus?${qs}` : '/olympus', { scroll: false });
  }, [router, searchParams]);

  // Detect new WIN resolutions off the shared spine's payload (skip the first settled
  // load to avoid a confetti storm on cached history).
  useEffect(() => {
    if (!data) return;
    for (const d of data.decisions.resolved) {
      if (d.outcome === 'win') {
        if (!isFirstLoad.current && !seenWinIds.current.has(d.decision_id)) {
          fireConfetti();
        }
        seenWinIds.current.add(d.decision_id);
      }
    }
    isFirstLoad.current = false;
  }, [data, fireConfetti]);

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-[#0D0B1A] px-4 py-8 text-white sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,_rgba(201,169,97,0.18),_transparent_62%)]"
        />

        <main className="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.32em] text-white/42">
                Greek, Norse, and Egyptian trading council
              </div>
              <h1 className="mt-2 font-sans text-3xl font-semibold uppercase tracking-wide text-white md:text-4xl">
                Olympus Fund
              </h1>
            </div>
            <div className="text-right font-mono text-[11px] text-white/45">
              <div>Live Droplet · 30s polling</div>
              <div>Updated {formatUpdated(state.ts)}</div>
              {error ? <div className="mt-1 text-amber-200">Using cached mock: {error}</div> : null}
            </div>
          </div>

          <EquityHeader state={state} />

          {/* Council → Anubis → Thor → Execution flow beam */}
          <CouncilFlowBeam />

          <AgentLegend agents={state.agents} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
            <div className="space-y-5 xl:order-1">
              {state.decisions.resolved.length > 0 ? (
                <RecentResolutions decisions={state.decisions.resolved.slice(0, 5)} />
              ) : null}
              <MacroPulse brief={state.macro_brief ?? null} />
            </div>

            <div className="xl:order-2">
              <ApprovedPositions decisions={state.decisions.approved} />
            </div>

            <div className="space-y-5 xl:order-3">
              <ActionBoard actions={state.strategic_actions ?? []} />
              <WhaleHunting flow={state.whale_flow ?? []} />
              <TradingBotsStatus bots={state.trading_bots ?? []} />
              <LivePortfolioSnapshot />
            </div>
          </div>
        </main>
      </div>

      {/* Confetti canvas — fixed full-screen, pointer-events-none */}
      <WinConfetti ref={confettiCanvasRef} />

      <DecisionDrawer decision={activeDecision} onClose={handleClose} />
      <OracleDrawer decisionContext={activeDecision} />
    </>
  );
}

export default function OlympusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0D0B1A] text-white/40">
          The realm stirs…
        </div>
      }
    >
      <OlympusInner />
    </Suspense>
  );
}
