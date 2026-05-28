'use client';

import type { StrategicAction } from '@/lib/olympus/types';

interface Props {
  actions: StrategicAction[];
}

const ACTION_TYPE_STYLE: Record<string, { label: string; className: string }> = {
  ENTER:    { label: 'ENTER',    className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' },
  EXIT:     { label: 'EXIT',     className: 'bg-orange-500/15 text-orange-300 border border-orange-500/25' },
  HOLD:     { label: 'HOLD',     className: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/25' },
  WATCH:    { label: 'WATCH',    className: 'bg-sky-500/15 text-sky-300 border border-sky-500/25' },
  RESEARCH: { label: 'RESEARCH', className: 'bg-white/8 text-white/45 border border-white/10' },
};

const TIMELINE_LABEL: Record<string, string> = {
  now:       'NOW',
  open:      'AT OPEN',
  EOD:       'EOD',
  this_week: 'THIS WEEK',
};

const PRIORITY_GLOW: Record<number, string> = {
  1: 'border-amber-400/40 shadow-[0_0_0_1px_rgba(251,191,36,0.15)]',
  2: 'border-white/12',
  3: 'border-white/8',
  4: 'border-white/6',
  5: 'border-white/4',
};

function PriorityDot({ priority }: { priority: number }) {
  const colors = ['', 'bg-amber-400', 'bg-amber-400/60', 'bg-white/30', 'bg-white/18', 'bg-white/10'];
  return (
    <span
      className={`mt-[5px] h-[6px] w-[6px] shrink-0 rounded-full ${colors[priority] ?? 'bg-white/10'}`}
      title={`Priority ${priority}`}
    />
  );
}

function formatDollar(n: number | null): string | null {
  if (n == null || n === 0) return null;
  return n >= 0
    ? `+$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `-$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function ActionRow({ action }: { action: StrategicAction }) {
  const typeStyle = ACTION_TYPE_STYLE[action.action_type] ?? ACTION_TYPE_STYLE.RESEARCH;
  const timelineLabel = TIMELINE_LABEL[action.timeline] ?? action.timeline.toUpperCase();
  const priorityBorder = PRIORITY_GLOW[action.priority] ?? 'border-white/6';
  const dollarStr = formatDollar(action.dollar_impact_est);
  const isCompleted = action.completed;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border bg-white/[0.03] px-3.5 py-2.5 transition-opacity ${priorityBorder} ${isCompleted ? 'opacity-35' : ''}`}
    >
      <PriorityDot priority={action.priority} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded px-1.5 py-px font-mono text-[9px] font-semibold tracking-widest ${typeStyle.className}`}>
            {typeStyle.label}
          </span>
          {action.ticker ? (
            <span className="font-mono text-[11px] font-semibold text-white/85">
              {action.ticker}
            </span>
          ) : null}
          <span className="ml-auto shrink-0 font-mono text-[9px] text-white/35 tracking-wider">
            {timelineLabel}
          </span>
        </div>

        <p className={`mt-1 text-[11px] leading-snug ${isCompleted ? 'line-through text-white/35' : 'text-white/65'}`}>
          {action.description}
        </p>

        <div className="mt-1.5 flex items-center gap-2">
          <span className="rounded bg-white/6 px-1.5 py-px text-[9px] text-white/40">
            {action.owner}
          </span>
          {dollarStr ? (
            <span className={`font-mono text-[10px] font-medium ${dollarStr.startsWith('+') ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
              {dollarStr}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ActionBoard({ actions }: Props) {
  const visible = (actions ?? [])
    .filter((a) => !a.completed)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 8);

  const completedCount = (actions ?? []).filter((a) => a.completed).length;

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-[0.3em] text-white/35">Action Board</div>
          <div className="mt-0.5 text-sm font-semibold text-white/85">Strategic Actions</div>
        </div>
        {completedCount > 0 ? (
          <span className="rounded-full bg-white/6 px-2 py-px text-[10px] text-white/35">
            {completedCount} done
          </span>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="py-4 text-center text-[11px] text-white/25">
          No pending actions — Anubis is watching.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((a) => (
            <ActionRow key={a.action_id} action={a} />
          ))}
        </div>
      )}
    </div>
  );
}
