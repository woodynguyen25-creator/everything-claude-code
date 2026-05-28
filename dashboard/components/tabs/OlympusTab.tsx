'use client';

import { useEffect, useState } from 'react';

interface Agent {
  name: string;
  role: string;
  symbol: string;
  phase: number;
  heritage: string;
  description: string;
}

interface OlympusData {
  fund: string;
  tagline: string;
  phase: number;
  roster: Agent[];
  watchlist: string[];
  decisions: Decision[];
  latestDecision: Decision | null;
  journal: Record<string, unknown>[];
  isLive: boolean;
  latestBrief: { ts: string; brief: string } | null;
  checkedAt: string;
}

interface CouncilOpinion {
  bull_case?: string;
  bear_case?: string;
  catalyst_summary?: string;
  confidence?: string;
  danger_level?: string;
  net_impact?: string;
  conviction_adjustment?: number;
}

interface Decision {
  decision_id: string;
  status: string;
  action: string;
  conviction: number;
  risk: { verdict?: string; reason?: string };
  proposal: {
    ticker?: string;
    direction?: string;
    thesis?: string;
    size_r?: number;
    dte?: number;
    risk_reward?: number;
  };
  council?: {
    apollo?: CouncilOpinion;
    athena?: CouncilOpinion;
    ares?: CouncilOpinion;
    regime?: string;
  };
  rationale: string;
  next_step: string;
  ts: string;
}

const PHASE_COLORS: Record<number, string> = {
  1: 'text-rune-gold border-rune-gold',
  2: 'text-text-secondary border-text-secondary',
  3: 'text-text-dim border-text-dim',
};

const PHASE_BG: Record<number, string> = {
  1: 'bg-rune-gold/10',
  2: 'bg-bg-hover',
  3: 'bg-bg-deep',
};

function AgentCard({ agent, currentPhase }: { agent: Agent; currentPhase: number }) {
  const isActive = agent.phase <= currentPhase;
  const isCurrentPhase = agent.phase === currentPhase;

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isActive
          ? 'border-rune-gold/30 bg-bg-hover'
          : 'border-bg-hover bg-bg-deep opacity-50'
      } ${isCurrentPhase ? 'ring-1 ring-rune-gold/20' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{agent.symbol}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary text-sm">{agent.name}</span>
              <span
                className={`text-rune rounded border px-1 py-0.5 text-[10px] tracking-widest ${PHASE_COLORS[agent.phase]}`}
              >
                P{agent.phase}
              </span>
              <span className="text-[10px] text-text-dim">{agent.heritage}</span>
            </div>
            <div className="text-xs text-rune-gold mt-0.5">{agent.role}</div>
          </div>
        </div>
        <span
          className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
            isActive ? 'bg-green-400' : 'bg-bg-hover'
          }`}
          title={isActive ? 'Active' : `Phase ${agent.phase}`}
        />
      </div>
      <p className="mt-2 text-xs text-text-secondary leading-relaxed">{agent.description}</p>
    </div>
  );
}

function JournalEntry({ entry }: { entry: Record<string, unknown> }) {
  const type = String(entry.type ?? 'entry');
  const ts = String(entry.ts ?? '');
  const time = ts ? new Date(ts).toLocaleString('en-US', { timeZone: 'America/Chicago' }) : '';

  const typeLabel: Record<string, { icon: string; label: string }> = {
    thor_decision:   { icon: 'T', label: 'Thor Decision' },
    macro_brief:     { icon: '⚡', label: 'Zeus Brief' },
    poseidon_veto:   { icon: '🌊', label: 'Poseidon Veto' },
    artemis_signal:  { icon: '🏹', label: 'Artemis Signal' },
  };

  const { icon, label } = typeLabel[type] ?? { icon: '📜', label: type };

  return (
    <div className="flex gap-3 py-2 border-b border-bg-hover last:border-0">
      <span className="text-base shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-rune-gold">{label}</span>
          {time && <span className="text-[10px] text-text-dim">{time}</span>}
        </div>
        {type === 'poseidon_veto' && (
          <div className={`text-xs mt-0.5 ${
            (entry.result as Record<string, unknown>)?.verdict === 'PASS'
              ? 'text-green-400' : 'text-red-400'
          }`}>
            {String((entry.result as Record<string, unknown>)?.verdict ?? '')} —{' '}
            {String((entry.result as Record<string, unknown>)?.reason ?? '')}
          </div>
        )}
        {type === 'artemis_signal' && (
          <div className="text-xs mt-0.5 text-text-secondary">
            {String(entry.ticker ?? '')} ${String(entry.strike ?? '')} {String(entry.right ?? '')} · V/OI {String(entry.voi_ratio ?? '')}x · ${Math.round(Number(entry.dollar_premium ?? 0) / 1000)}K
          </div>
        )}
        {type === 'macro_brief' && (
          <div className="text-xs mt-0.5 text-text-secondary line-clamp-2">
            {String(entry.brief ?? '').slice(0, 120)}…
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionQueue({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) {
    return (
      <div className="rounded-lg border border-bg-hover bg-bg-deep p-4 text-xs text-text-dim">
        Thor has no decisions queued yet. The first Artemis sweep will create a reviewable proposal ledger.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {decisions.map((decision) => {
        const passed = decision.status === 'passed_risk';
        const ticker = decision.proposal?.ticker ?? '?';
        const direction = String(decision.proposal?.direction ?? '').replace('_', ' ');
        const time = decision.ts
          ? new Date(decision.ts).toLocaleString('en-US', { timeZone: 'America/Chicago' })
          : '';

        return (
          <div
            key={decision.decision_id}
            className={`rounded-lg border p-4 ${
              passed ? 'border-green-400/25 bg-green-400/5' : 'border-red-400/20 bg-red-400/5'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{ticker}</span>
                  <span className="text-[10px] uppercase tracking-widest text-text-dim">{direction}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-text-dim">{time}</div>
              </div>
              <div className="text-right">
                <div className={`text-rune text-xs tracking-widest ${passed ? 'text-green-400' : 'text-red-400'}`}>
                  {passed ? 'PASSED' : 'REJECTED'}
                </div>
                <div className="text-[10px] text-text-secondary">
                  {typeof decision.conviction === 'number' ? decision.conviction.toFixed(1) : decision.conviction}/10
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-text-secondary">{decision.proposal?.thesis}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded border border-bg-hover px-2 py-0.5 text-[10px] text-text-dim">
                {Number(decision.proposal?.size_r ?? 0).toFixed(2)}R
              </span>
              <span className="rounded border border-bg-hover px-2 py-0.5 text-[10px] text-text-dim">
                {decision.proposal?.dte ?? '?'} DTE
              </span>
              <span className="rounded border border-bg-hover px-2 py-0.5 text-[10px] text-text-dim">
                R:R {decision.proposal?.risk_reward ?? '?'}
              </span>
              <span className="rounded border border-bg-hover px-2 py-0.5 text-[10px] text-text-dim">
                Poseidon {decision.risk?.verdict ?? '?'}
              </span>
            </div>

            <div className="mt-3 text-[11px] leading-relaxed text-text-dim">
              {decision.risk?.reason}
            </div>

            {/* Council debate — Apollo / Athena / Ares */}
            {decision.council && (
              <div className="mt-3 space-y-1 border-t border-bg-hover pt-3">
                {decision.council.apollo?.bull_case && (
                  <div className="text-[11px] text-text-secondary">
                    <span className="text-yellow-400">☀️</span>{' '}
                    <span className="text-rune-gold">{decision.council.apollo.confidence}</span>{' '}
                    {decision.council.apollo.bull_case.slice(0, 100)}
                  </div>
                )}
                {decision.council.athena?.bear_case && (
                  <div className="text-[11px] text-text-secondary">
                    <span className="text-blue-400">🦉</span>{' '}
                    <span className={decision.council.athena.danger_level === 'HIGH' || decision.council.athena.danger_level === 'CRITICAL' ? 'text-red-400' : 'text-text-dim'}>
                      {decision.council.athena.danger_level}
                    </span>{' '}
                    {decision.council.athena.bear_case.slice(0, 100)}
                  </div>
                )}
                {decision.council.ares?.catalyst_summary && (
                  <div className="text-[11px] text-text-dim">
                    <span>⚔️</span>{' '}{decision.council.ares.catalyst_summary.slice(0, 90)}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OlympusTab() {
  const [data, setData] = useState<OlympusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/olympus')
      .then((r) => r.json())
      .then((d: OlympusData) => { setData(d); setLoading(false); })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="px-12 py-8 text-text-secondary text-sm animate-pulse">
        ⚡ Consulting the gods…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="px-12 py-8 text-red-400 text-sm">
        ❌ {error ?? 'No data'}
      </div>
    );
  }

  const phase1Agents = data.roster.filter((a) => a.phase === 1);
  const phase2Agents = data.roster.filter((a) => a.phase === 2);
  const phase3Agents = data.roster.filter((a) => a.phase === 3);
  const decisions = data.decisions ?? [];

  return (
    <div className="px-12 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-rune text-2xl tracking-[0.2em] text-rune-gold">OLYMPUS FUND</h2>
            <span
              className={`rounded border px-2 py-0.5 text-rune text-[11px] tracking-widest ${
                data.isLive
                  ? 'border-green-400 text-green-400'
                  : 'border-text-dim text-text-dim'
              }`}
            >
              {data.isLive ? '● LIVE' : '○ DEPLOYING'}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary italic">{data.tagline}</p>
        </div>
        <div className="text-right text-[11px] text-text-dim">
          <div>Phase {data.phase} / 4</div>
          <div>{data.watchlist.length} tickers tracked</div>
        </div>
      </div>

      {/* Zeus latest brief */}
      {data.latestBrief && (
        <div className="rounded-lg border border-rune-gold/20 bg-bg-hover p-4">
          <div className="flex items-center gap-2 mb-2">
            <span>⚡</span>
            <span className="text-rune-gold text-sm font-medium">Zeus — Latest Oracle</span>
            <span className="text-[10px] text-text-dim ml-auto">
              {new Date(data.latestBrief.ts).toLocaleString('en-US', { timeZone: 'America/Chicago' })}
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
            {data.latestBrief.brief}
          </p>
        </div>
      )}

      {/* Thor decision queue */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-rune text-sm tracking-[0.2em] text-text-primary">THOR DECISION QUEUE</h3>
          <div className="h-px flex-1 bg-bg-hover" />
          <span className="text-[10px] text-text-dim">{decisions.length} latest</span>
        </div>
        <DecisionQueue decisions={decisions} />
      </div>

      {/* Roster grid */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-rune text-sm tracking-[0.2em] text-text-primary">THE COUNCIL</h3>
          <div className="h-px flex-1 bg-bg-hover" />
        </div>

        {/* Phase 1 */}
        <div className="mb-2">
          <div className="text-[10px] text-rune-gold tracking-widest mb-2 text-rune">PHASE 1 — ACTIVE</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {phase1Agents.map((a) => (
              <AgentCard key={a.name} agent={a} currentPhase={data.phase} />
            ))}
          </div>
        </div>

        {/* Phase 2 */}
        <div className="mt-4 mb-2">
          <div className="text-[10px] text-text-dim tracking-widest mb-2 text-rune">PHASE 2 — WEEK 2</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {phase2Agents.map((a) => (
              <AgentCard key={a.name} agent={a} currentPhase={data.phase} />
            ))}
          </div>
        </div>

        {/* Phase 3 */}
        <div className="mt-4">
          <div className="text-[10px] text-text-dim tracking-widest mb-2 text-rune">PHASE 3 — WEEKS 3-4</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {phase3Agents.map((a) => (
              <AgentCard key={a.name} agent={a} currentPhase={data.phase} />
            ))}
          </div>
        </div>
      </div>

      {/* Watchlist */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-rune text-sm tracking-[0.2em] text-text-primary">WATCHLIST</h3>
          <div className="h-px flex-1 bg-bg-hover" />
        </div>
        <div className="flex flex-wrap gap-2">
          {data.watchlist.map((ticker) => (
            <span
              key={ticker}
              className="rounded border border-bg-hover bg-bg-deep px-3 py-1 text-rune text-xs tracking-widest text-text-secondary"
            >
              {ticker}
            </span>
          ))}
        </div>
      </div>

      {/* Journal */}
      {data.journal.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-rune text-sm tracking-[0.2em] text-text-primary">JOURNAL</h3>
            <div className="h-px flex-1 bg-bg-hover" />
            <span className="text-[10px] text-text-dim">last {data.journal.length} entries</span>
          </div>
          <div className="rounded-lg border border-bg-hover bg-bg-deep p-4">
            {data.journal.map((entry, i) => (
              <JournalEntry key={i} entry={entry as Record<string, unknown>} />
            ))}
          </div>
        </div>
      )}

      {!data.isLive && (
        <div className="rounded border border-text-dim/20 bg-bg-deep p-4 text-xs text-text-dim">
          🚀 <strong className="text-text-secondary">Olympus agents not yet deployed.</strong>{' '}
          Run <code className="text-rune-gold">deploy.sh</code> on the Droplet to activate Phase 1.
        </div>
      )}
    </div>
  );
}
