// Shared formatting for live-session heartbeats inside Operations. Status language
// mirrors Woody's terminal: green=active, bifrost=working, muted=idle, amber=blocked,
// red=down. Extracted so OperationsSurface + SessionCard stay focused.

export type Heartbeat = {
  session: string;
  persona: string;
  icon: string;
  status: string;
  focus: string;
  last_output: string;
  group: string;
  ts: string;
};

export type StatusStyle = {
  label: string;
  text: string;
  dot: string;
  border: string;
  /** soft animated glow applied to "alive" cards (active / working) */
  glow: string;
};

export const STATUS_STYLE: Record<string, StatusStyle> = {
  active: {
    label: 'ACTIVE',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-[0_0_22px_-12px_rgba(52,211,153,0.9)]',
  },
  working: {
    label: 'WORKING',
    text: 'text-bifrost',
    dot: 'bg-bifrost',
    border: 'border-bifrost/30',
    glow: 'shadow-[0_0_22px_-12px_oklch(var(--color-bifrost)/0.85)]',
  },
  idle: { label: 'IDLE', text: 'text-text-muted', dot: 'bg-text-muted', border: 'border-border-subtle', glow: '' },
  blocked: { label: 'BLOCKED', text: 'text-amber-400', dot: 'bg-amber-400', border: 'border-amber-500/30', glow: '' },
  error: { label: 'DOWN', text: 'text-red-400', dot: 'bg-red-400', border: 'border-red-500/30', glow: '' },
};

// LeBot James' blunt verdict on the worst session — the CEO's voice.
export const VERDICTS: Record<string, (name: string) => string> = {
  error: (n) => `${n} blew a gasket. Fix it or I pull the plug.`,
  blocked: (n) => `${n}'s stuck in the paint — somebody set a screen.`,
  idle: (n) => `${n}'s napping on the bench. Wake it or reassign the thread.`,
  working: (n) => `${n}'s grinding. Locked in — let it cook.`,
  active: (n) => `${n}'s running the floor. Stay green.`,
};

export const PRIORITY: Record<string, number> = { error: 5, blocked: 4, idle: 3, working: 2, active: 1 };

export function styleFor(status: string): StatusStyle {
  return STATUS_STYLE[status] ?? STATUS_STYLE.idle;
}

export function isAlive(status: string): boolean {
  return status === 'active' || status === 'working';
}

export function relTime(ts: string): string {
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return '?';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function isStale(ts: string): boolean {
  const then = new Date(ts).getTime();
  return Number.isNaN(then) || Date.now() - then > 30 * 60000;
}
