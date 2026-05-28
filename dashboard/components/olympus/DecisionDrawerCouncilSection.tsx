'use client';

import { AGENT_COLORS } from '@/lib/olympus/colors';
import type { AgentName, AgentCallMetadata } from '@/lib/olympus/types';
import { DecisionDrawerMetadata } from './DecisionDrawerMetadata';

type CouncilSectionProps = {
  agent: AgentName;
  label: string;
  text: string | undefined;
  meta?: AgentCallMetadata;
};

export function DecisionDrawerCouncilSection({
  agent,
  label,
  text,
  meta,
}: CouncilSectionProps) {
  if (!text && !meta) return null;

  const color = AGENT_COLORS[agent];

  return (
    <div className="flex gap-3">
      {/* Left accent bar */}
      <div
        className="mt-1 w-[3px] shrink-0 rounded-full"
        style={{ background: color.hex, opacity: 0.75 }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px]">{color.emoji}</span>
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: color.hex }}
          >
            {color.label}
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">{label}</span>
        </div>
        {text ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/78">{text}</p>
        ) : (
          <p className="mt-1.5 text-[12px] italic text-white/30">No text recorded</p>
        )}
        {meta ? <DecisionDrawerMetadata meta={meta} /> : null}
      </div>
    </div>
  );
}
