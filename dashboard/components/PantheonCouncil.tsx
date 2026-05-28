'use client';

import { useEffect, useState } from 'react';

type AgentState = 'live' | 'idle' | 'down' | 'unknown';

interface Agent {
  id: string;
  name: string;
  title: string;
  role: string;
  state: AgentState;
  lastActivity: string | null;
  metric: string | null;
  detail: string | null;
  cron: string | null;
}

const STATE_LABEL: Record<AgentState, string> = {
  live: 'active',
  idle: 'idle',
  down: 'down',
  unknown: 'unknown',
};

const STATE_HELP: Record<AgentState, string> = {
  live: 'Actively running and producing fresh work',
  idle: 'Configured and ready, but no current job (on-demand or awaiting trigger)',
  down: 'Agent itself has stopped responding',
  unknown: 'No recent state data',
};

function LegendStrip() {
  return (
    <div className="mx-12 mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-5 py-3 text-[11px] text-white/55 backdrop-blur">
      <span className="text-[9px] uppercase tracking-[0.18em] text-white/35">Legend</span>
      {(['live', 'idle', 'down', 'unknown'] as AgentState[]).map((s) => (
        <span key={s} className="flex items-center gap-2" title={STATE_HELP[s]}>
          <span className={`inline-block size-2 rounded-full ${STATE_DOT[s]}`} />
          <span className="text-white/80">{STATE_LABEL[s]}</span>
          <span className="text-white/40">— {STATE_HELP[s]}</span>
        </span>
      ))}
    </div>
  );
}

const STATE_DOT: Record<AgentState, string> = {
  live: 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)]',
  idle: 'bg-amber-300/80 shadow-[0_0_8px_rgba(252,211,77,0.4)]',
  down: 'bg-red-500/90 shadow-[0_0_10px_rgba(239,68,68,0.7)]',
  unknown: 'bg-white/25',
};

const AVATAR_GLYPH: Record<string, string> = {
  'lebot-james': 'L',
  thor: 'T',
  atlas: 'A',
  fenrir: 'F',
  sauron: 'S',
  perseus: 'P',
  parlay: 'Π',
};

const AVATAR_BG: Record<string, string> = {
  'lebot-james': 'from-amber-400/30 via-orange-500/15 to-transparent ring-amber-300/35',
  thor: 'from-sky-400/30 via-indigo-500/15 to-transparent ring-sky-300/35',
  atlas: 'from-stone-300/30 via-stone-500/15 to-transparent ring-stone-200/35',
  fenrir: 'from-zinc-300/30 via-violet-500/15 to-transparent ring-violet-300/35',
  sauron: 'from-orange-400/35 via-rose-500/15 to-transparent ring-orange-300/35',
  perseus: 'from-yellow-300/30 via-amber-500/15 to-transparent ring-yellow-300/35',
  parlay: 'from-emerald-400/30 via-teal-500/15 to-transparent ring-emerald-300/35',
};

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div
      className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent p-6 shadow-[0_10px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all hover:border-white/15"
      title={STATE_HELP[agent.state]}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${AVATAR_BG[agent.id] ?? AVATAR_BG.perseus} ring-1 ring-inset`}
          >
            <span className="font-serif text-2xl text-white/90">{AVATAR_GLYPH[agent.id] ?? agent.name[0]}</span>
            <span className={`absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-bg-deep ${STATE_DOT[agent.state]}`} />
          </div>
          <div>
            <div className="text-base font-medium text-white">{agent.name}</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">{agent.title}</div>
          </div>
        </div>
        <span
          className={`text-[10px] uppercase tracking-[0.18em] ${agent.state === 'live' ? 'text-emerald-200/85' : agent.state === 'down' ? 'text-red-300/85' : 'text-white/45'}`}
        >
          {STATE_LABEL[agent.state]}
        </span>
      </div>

      <div className="mt-4 text-[13px] leading-relaxed text-white/75">{agent.role}</div>

      <div className="mt-5 space-y-1.5 border-t border-white/[0.06] pt-4 text-[11px] text-white/55">
        {agent.metric && (
          <div className="flex justify-between gap-3">
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/35">Metric</span>
            <span className="truncate text-right text-white/75">{agent.metric}</span>
          </div>
        )}
        {agent.detail && (
          <div className="flex justify-between gap-3">
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/35">State</span>
            <span className="truncate text-right text-white/65">{agent.detail}</span>
          </div>
        )}
        {agent.lastActivity && (
          <div className="flex justify-between gap-3">
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/35">Last</span>
            <span className="truncate text-right text-white/65">{agent.lastActivity}</span>
          </div>
        )}
        {agent.cron && (
          <div className="flex justify-between gap-3">
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/35">Cron</span>
            <span className="truncate text-right text-white/65">{agent.cron}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PantheonCouncil() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/pantheon', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) setAgents(data.agents);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'fetch failed');
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (err) {
    return (
      <div className="mx-12 mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
        Council unreachable: {err}
      </div>
    );
  }

  if (!agents) {
    return (
      <div className="mx-12 mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent" />
        ))}
      </div>
    );
  }

  return (
    <>
      <LegendStrip />
      <div className="mx-12 mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
    </>
  );
}
