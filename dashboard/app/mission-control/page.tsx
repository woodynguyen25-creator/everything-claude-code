'use client';

import { useEffect, useState } from 'react';
import { AgentGrid } from '@/components/mission-control/AgentGrid';
import { CategoryFilter } from '@/components/mission-control/CategoryFilter';
import mockAgents from '@/data/mission-control-mock.json';
import type { AgentActivity } from '@/lib/mission-control/types';

type Category = 'all' | 'aios' | 'olympus' | 'trading' | 'ops';

const INITIAL_AGENTS = mockAgents as AgentActivity[];

export default function MissionControlPage() {
  const [agents, setAgents] = useState<AgentActivity[]>(INITIAL_AGENTS);
  const [filter, setFilter] = useState<Category>('all');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/mission-control/agents', { cache: 'no-store' });
        if (res.ok && !cancelled) {
          setAgents(await res.json());
        }
      } catch {
        // Mock-first fallback remains in place.
      }
    };

    load();
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const filtered = filter === 'all' ? agents : agents.filter((agent) => agent.category === filter);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">Full system view</div>
          <h1 className="mt-2 font-display text-3xl tracking-wide text-text-primary">Mission Control</h1>
        </div>
        <CategoryFilter value={filter} onChange={setFilter} />
      </div>

      <div className="mb-5 text-[11px] uppercase tracking-[0.16em] text-white/40">
        {filtered.length} agents visible
      </div>

      <AgentGrid agents={filtered} />
    </main>
  );
}
