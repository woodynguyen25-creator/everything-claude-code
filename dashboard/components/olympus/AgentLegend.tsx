import { AGENT_COLORS, AGENT_ORDER } from '@/lib/olympus/colors';
import type { AgentActivity } from '@/lib/olympus/types';

type AgentLegendProps = {
  agents: AgentActivity[];
};

export function AgentLegend({ agents }: AgentLegendProps) {
  const activity = new Map(agents.map((agent) => [agent.agent, agent]));

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-panel/85 px-4 py-3 shadow-panel backdrop-blur-xl">
      {/* Horizontal scroll on mobile, wrap on larger screens */}
      <div
        className="flex items-center gap-2 overflow-x-auto md:flex-wrap"
        style={{ scrollbarWidth: 'none' }}
      >
        {AGENT_ORDER.map((agent) => {
          const color = AGENT_COLORS[agent];
          const state = activity.get(agent);
          const statusColor = state?.status === 'error' ? 'oklch(58% 0.20 25)' : state?.status === 'active' ? 'oklch(60% 0.14 155)' : 'rgba(255,255,255,0.33)';
          return (
            <span
              key={agent}
              className="group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-transform hover:-translate-y-0.5"
              style={{
                borderColor: `${color.hex}55`,
                color: color.hex,
                boxShadow: `0 0 18px ${color.glow}`,
              }}
              title={`${color.label}: ${state?.last_action ?? 'no activity yet'}`}
            >
              <span>{color.emoji}</span>
              <span className="font-semibold text-text-primary">{color.label}</span>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
              <span className="hidden font-mono text-[10px] text-text-muted xl:inline">
                {state?.provider_last ?? `${state?.calls_today ?? 0} calls`}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
