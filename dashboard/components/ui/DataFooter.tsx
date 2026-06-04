// Standardized data-honesty footer. Every data panel can show where its
// numbers came from and how fresh they are — so you always know if you're
// looking at reality. (operator decision 2026-05-29)

export type DataState = 'live' | 'stale' | 'sample' | 'loading' | 'error';

type Props = {
  source: string;
  state: DataState;
  ageSec?: number | null;
  className?: string;
};

function dot(state: DataState): string {
  switch (state) {
    case 'live':
      return 'bg-emerald-400';
    case 'stale':
      return 'bg-amber-400';
    case 'sample':
      return 'bg-white/30';
    case 'error':
      return 'bg-rose-500';
    case 'loading':
    default:
      return 'bg-white/20';
  }
}

function label(state: DataState, source: string, ageSec?: number | null): string {
  if (state === 'loading') return `${source} · checking…`;
  if (state === 'error') return `${source} · unreachable`;
  if (state === 'sample') return `SAMPLE — ${source}`;
  const age =
    ageSec == null ? '' : ageSec < 60 ? ` · ${ageSec}s` : ` · ${Math.floor(ageSec / 60)}m`;
  return `${source}${age}`;
}

export function DataFooter({ source, state, ageSec, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`.trim()}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot(state)} ${state === 'live' ? 'animate-ember-pulse' : ''}`} />
      <span className="font-mono text-[10px] text-text-muted">{label(state, source, ageSec)}</span>
    </div>
  );
}
