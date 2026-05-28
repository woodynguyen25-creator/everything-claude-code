'use client';

import type { CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AGENT_COLORS } from '@/lib/olympus/colors';
import type { AgentName, Decision } from '@/lib/olympus/types';

type DecisionCardProps = {
  decision: Decision;
};

const COUNCIL_KEYS: Array<{ key: keyof Decision['council']; agent: AgentName }> = [
  { key: 'zeus_macro', agent: 'zeus' },
  { key: 'apollo_bull', agent: 'apollo' },
  { key: 'athena_bear', agent: 'athena' },
  { key: 'ares_catalyst', agent: 'ares' },
  { key: 'loki_redteam', agent: 'loki' },
];

function money(value: number | null) {
  if (value === null) return '--';
  return `$${value.toFixed(2)}`;
}

function shortDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
  });
}

function statusStyles(decision: Decision) {
  if (decision.status === 'win') return 'border-emerald-300/40 bg-emerald-400/10 text-emerald-200';
  if (decision.status === 'loss') return 'border-rose-300/40 bg-rose-400/10 text-rose-200';
  if (decision.status === 'expired') return 'border-white/20 bg-white/[0.06] text-white/60';
  if (decision.status === 'rejected') return 'border-rose-400/30 bg-rose-400/8 text-rose-200';
  if (decision.status === 'active') return 'border-sky-300/40 bg-sky-400/10 text-sky-100';
  return 'border-amber-300/40 bg-amber-300/10 text-amber-100';
}

export function DecisionCard({ decision }: DecisionCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accent = decision.status === 'rejected' ? AGENT_COLORS.loki : decision.status === 'candidate' ? AGENT_COLORS.artemis : AGENT_COLORS.thor;
  const convictionWidth = `${Math.max(0, Math.min(decision.conviction, 10)) * 10}%`;

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('decision', decision.decision_id);
    router.replace(`/olympus?${params.toString()}`, { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group w-full rounded-xl border border-white/[0.08] bg-[rgba(12,10,26,0.78)] p-4 text-left shadow-[0_8px_32px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-sky-300/35 hover:shadow-[0_0_24px_#3B82F640]"
      style={{ '--accent': accent.hex } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-sans text-2xl font-bold tracking-wide text-white">{decision.ticker}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                decision.right === 'call'
                  ? 'border-emerald-300/35 bg-emerald-400/10 text-emerald-200'
                  : 'border-rose-300/35 bg-rose-400/10 text-rose-200'
              }`}
            >
              {decision.right}
            </span>
            <span className="font-mono text-xs text-white/55">${decision.strike}</span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-white/38">EXP {shortDate(decision.expiry)}</div>
        </div>
        <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusStyles(decision)}`}>
          {decision.outcome ?? decision.status}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">Conviction</span>
          <span className="font-mono text-xs text-white/75">{decision.conviction.toFixed(1)}/10</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-white"
            style={{ width: convictionWidth }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/[0.05] bg-white/[0.03] p-2">
        <div>
          <div className="text-[9px] uppercase tracking-[0.16em] text-white/35">Entry</div>
          <div className="mt-1 font-mono text-xs text-white/80">{money(decision.entry_price)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.16em] text-white/35">Target</div>
          <div className="mt-1 font-mono text-xs text-emerald-200">{money(decision.target_price)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.16em] text-white/35">Stop</div>
          <div className="mt-1 font-mono text-xs text-rose-200">{money(decision.stop_price)}</div>
        </div>
      </div>

      {decision.rationale ? (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-white/58">{decision.rationale}</p>
      ) : null}

      {decision.status === 'win' || decision.status === 'loss' || decision.status === 'expired' ? (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.03] px-3 py-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">Realized</span>
          <span className={`font-mono text-sm ${Number(decision.realized_r ?? 0) >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
            {decision.realized_r === null ? '--' : `${decision.realized_r.toFixed(2)}R`} / {money(decision.exit_price)}
          </span>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {COUNCIL_KEYS.filter(({ key }) => Boolean(decision.council[key])).map(({ key, agent }) => {
          const color = AGENT_COLORS[agent];
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold"
              style={{ borderColor: `${color.hex}55`, color: color.hex, background: `${color.hex}10` }}
              title={decision.council[key]}
            >
              <span>{color.emoji}</span>
              <span>{color.label}</span>
            </span>
          );
        })}
      </div>
    </button>
  );
}
