import { AgentCard } from '@/components/mission-control/AgentCard';
import type { AgentActivity } from '@/lib/mission-control/types';

export function AgentGrid({ agents }: { agents: AgentActivity[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {agents.map((agent) => (
        <AgentCard key={agent.slug} agent={agent} />
      ))}
    </div>
  );
}
