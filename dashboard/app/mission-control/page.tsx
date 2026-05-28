'use client';

import { useEffect, useState } from 'react';
import { AgentGrid } from '@/components/mission-control/AgentGrid';
import { ActivityRiver } from '@/components/mission-control/ActivityRiver';
import { CategoryFilter } from '@/components/mission-control/CategoryFilter';
import { PageShell } from '@/components/layout/PageShell';
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
    <PageShell
      title="Mission Control"
      eyebrow="Full system view"
      maxWidth={1600}
      rightSlot={<CategoryFilter value={filter} onChange={setFilter} />}
    >
      <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-white/40">
        {filtered.length} agents visible
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <AgentGrid agents={filtered} />
        <div className="hidden lg:block">
          <ActivityRiver />
        </div>
      </div>

      <div className="mt-6 lg:hidden">
        <ActivityRiver />
      </div>
    </PageShell>
  );
}
