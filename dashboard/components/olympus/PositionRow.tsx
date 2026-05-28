'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { BorderBeam } from '@/components/twentyfirst/BorderBeam';
import { AGENT_COLORS } from '@/lib/olympus/colors';
import type { AgentName, Decision } from '@/lib/olympus/types';

type PositionRowProps = {
  decision: Decision;
  isTopConviction?: boolean;
  isLive?: boolean;
};

const COUNCIL_KEYS: Array<{ key: keyof Decision['council']; agent: AgentName }> = [
  { key: 'zeus_macro', agent: 'zeus' },
  { key: 'apollo_bull', agent: 'apollo' },
  { key: 'athena_bear', agent: 'athena' },
  { key: 'ares_catalyst', agent: 'ares' },
  { key: 'loki_redteam', agent: 'loki' },
];

function shortExpiry(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
  });
}

function statusTone(decision: Decision) {
  if (decision.status === 'win') return 'text-emerald-200';
  if (decision.status === 'loss') return 'text-rose-200';
  if (decision.status === 'active') return 'text-sky-100';
  if (decision.status === 'rejected') return 'text-rose-300';
  return 'text-amber-100';
}

export function PositionRow({ decision, isTopConviction = false, isLive = false }: PositionRowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isCall = decision.right === 'call';
  const isPut = decision.right === 'put';

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('decision', decision.decision_id);
    router.replace(`/olympus?${params.toString()}`, { scroll: false });
  };

  const councilVoted = COUNCIL_KEYS.filter(({ key }) => Boolean(decision.council[key]));
  const voteCount = councilVoted.length;

  const button = (
    <button
      type="button"
      onClick={handleClick}
      className={`group grid w-full grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 rounded-xl bg-white/[0.025] px-3 py-2.5 text-left transition-all ${
        isTopConviction
          ? 'border border-transparent'
          : 'border border-white/[0.06] hover:border-[#C9A96155] hover:bg-[#C9A96108]'
      }`}
    >
      <div className="flex items-baseline gap-2 overflow-hidden">
        <span className="font-sans text-base font-bold tracking-wide text-white">{decision.ticker}</span>
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
            isCall
              ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-200'
              : isPut
              ? 'border-rose-300/40 bg-rose-400/10 text-rose-200'
              : 'border-white/20 text-white/60'
          }`}
        >
          {decision.right}
        </span>
        {/* LIVE badge — shown when this position exists in real Robinhood portfolio */}
        {isLive && (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
            live
          </span>
        )}
      </div>

      <span className="font-mono text-xs text-white/72">${decision.strike}</span>

      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">
        {shortExpiry(decision.expiry)}
      </span>

      <span className="flex items-center gap-1" title={`${voteCount}/5 council weighed in`}>
        {COUNCIL_KEYS.map(({ key, agent }) => {
          const voted = Boolean(decision.council[key]);
          const color = AGENT_COLORS[agent];
          return (
            <span
              key={key}
              className="h-1.5 w-1.5 rounded-full transition-opacity"
              style={{
                background: voted ? color.hex : 'transparent',
                border: voted ? 'none' : `1px solid ${color.hex}40`,
                opacity: voted ? 0.95 : 0.4,
              }}
              aria-label={`${color.label}: ${voted ? 'voted' : 'no vote'}`}
            />
          );
        })}
      </span>

      <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${statusTone(decision)}`}>
        {decision.outcome ?? decision.status}
      </span>
    </button>
  );

  if (isTopConviction) {
    return <BorderBeam active speed={5}>{button}</BorderBeam>;
  }

  return button;
}
