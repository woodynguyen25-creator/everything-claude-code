import type { AgentActivity } from '@/lib/mission-control/types';

function relativeTime(ts: string) {
  const diffMs = Date.now() - new Date(ts).getTime();
  const diffMin = Math.max(1, Math.round(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

function providerTone(provider: AgentActivity['provider']) {
  if (provider === 'gemini') return 'border-sky-300/30 bg-sky-400/10 text-sky-200';
  if (provider === 'cerebras') return 'border-rose-300/30 bg-rose-400/10 text-rose-200';
  if (provider === 'groq') return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200';
  if (provider === 'deepseek') return 'border-amber-300/30 bg-amber-400/10 text-amber-200';
  return 'border-white/10 bg-white/[0.05] text-white/55';
}

function categoryTone(category: AgentActivity['category']) {
  if (category === 'aios') return 'text-rune-gold';
  if (category === 'olympus') return 'text-[#C9A961]';
  if (category === 'ops') return 'text-violet-300';
  return 'text-emerald-300';
}

export function AgentCard({ agent }: { agent: AgentActivity }) {
  const isActive = agent.status === 'active';
  const isError = agent.status === 'error';

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.82)] p-4 shadow-[0_14px_54px_rgba(0,0,0,0.38)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{agent.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold tracking-wide text-white">{agent.codename}</div>
              <div className={`text-[10px] uppercase tracking-[0.18em] ${categoryTone(agent.category)}`}>
                {agent.category}
              </div>
            </div>
          </div>
        </div>

        {/* Animated status dot */}
        <div className="mt-1 flex-shrink-0">
          {isActive ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" style={{ animationDuration: '1.5s' }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
            </span>
          ) : isError ? (
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-400" />
          ) : (
            <span className="flex h-2.5 w-2.5 rounded-full bg-white/25" />
          )}
        </div>
      </div>

      {/* Last action — marquee if long */}
      <div className="mt-4 overflow-hidden">
        <p
          className="whitespace-nowrap text-sm leading-relaxed text-white/68 hover:[animation-play-state:paused]"
          style={{
            animation: agent.last_action.length > 30
              ? 'marquee-scroll 18s linear infinite'
              : undefined,
          }}
        >
          {agent.last_action}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-white/45">
        <span>{relativeTime(agent.last_action_ts)}</span>
        <span>{agent.calls_today.toLocaleString()} calls today</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${providerTone(agent.provider)}`}>
          {agent.provider}
        </span>
        <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/58">
          {agent.status}
        </span>
      </div>
    </article>
  );
}
