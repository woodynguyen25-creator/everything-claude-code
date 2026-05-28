'use client';

import { useEffect, useRef, useState } from 'react';
import type { AgentActivity as OlympusAgent } from '@/lib/olympus/types';
import type { AgentActivity as MissionAgent } from '@/lib/mission-control/types';

const AGENT_COLORS: Record<string, string> = {
  zeus: '#60a5fa',
  poseidon: '#38bdf8',
  artemis: '#a78bfa',
  apollo: '#fbbf24',
  athena: '#94a3b8',
  ares: '#f87171',
  loki: '#fb923c',
  anubis: '#C9A961',
  hades: '#8b5cf6',
  hephaestus: '#f97316',
  calliope: '#ec4899',
};

type RiverEntry = {
  id: string;
  agent: string;
  action: string;
  ts: string;
  provider: string | null;
  isNew?: boolean;
};

function timeLabel(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function agentColor(agent: string): string {
  return AGENT_COLORS[agent.toLowerCase()] ?? '#94a3b8';
}

export function ActivityRiver() {
  const [entries, setEntries] = useState<RiverEntry[]>([]);
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Pull from olympus/state for Olympus agents
        const res = await fetch('/api/olympus/state', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();

        const olympusAgents: OlympusAgent[] = data.agents ?? [];
        const newEntries: RiverEntry[] = olympusAgents
          .filter((a) => a.last_action && a.last_action_ts)
          .map((a) => ({
            id: `${a.agent}-${a.last_action_ts}`,
            agent: a.agent,
            action: a.last_action,
            ts: a.last_action_ts,
            provider: a.provider_last ?? null,
          }));

        // Also pull from mission-control/agents for AIOS council
        const res2 = await fetch('/api/mission-control/agents', { cache: 'no-store' });
        if (!res2.ok || cancelled) return;
        const aiosData: MissionAgent[] = await res2.json();

        const aiosEntries: RiverEntry[] = aiosData
          .filter((a) => a.category === 'aios' && a.last_action && a.last_action_ts)
          .map((a) => ({
            id: `aios-${a.slug}-${a.last_action_ts}`,
            agent: a.codename.toLowerCase(),
            action: a.last_action,
            ts: a.last_action_ts,
            provider: a.provider ?? null,
          }));

        const combined = [...newEntries, ...aiosEntries]
          .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
          .slice(0, 50);

        const prevIds = prevIdsRef.current;
        const markedNew = combined.map((e) => ({ ...e, isNew: !prevIds.has(e.id) }));
        prevIdsRef.current = new Set(combined.map((e) => e.id));

        if (!cancelled) setEntries(markedNew);
      } catch {
        // fail silently — activity river is purely decorative
      }
    }

    load();
    const timer = window.setInterval(load, 30_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  if (entries.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-2xl border border-white/[0.06] bg-[rgba(12,10,26,0.6)] text-sm text-white/30">
        Listening for activity...
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] backdrop-blur-xl">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-white/50">⚡ Activity River</h2>
        <p className="mt-0.5 text-[10px] text-white/30">Live agent actions · 30s refresh</p>
      </div>

      <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="border-b border-white/[0.04] px-4 py-3 last:border-0"
            style={entry.isNew ? { animation: 'river-fade-in 0.6s ease-out' } : undefined}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: agentColor(entry.agent) }}
              >
                {entry.agent}
              </span>
              {entry.provider && entry.provider !== 'none' && (
                <span className="rounded-sm bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/35">
                  {entry.provider}
                </span>
              )}
              <span className="ml-auto font-mono text-[10px] text-white/25">
                {timeLabel(entry.ts)}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-white/60 line-clamp-2">
              {entry.action}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
