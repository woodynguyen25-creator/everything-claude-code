'use client';

import type { AgentCallMetadata } from '@/lib/olympus/types';
import { estimateCost, formatCost } from '@/lib/olympus/pricing';
import type { Provider } from '@/lib/olympus/pricing';

type DecisionDrawerMetadataProps = {
  meta: AgentCallMetadata;
};

function formatTs(isoTs: string): string {
  try {
    return new Date(isoTs).toLocaleTimeString('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoTs;
  }
}

export function DecisionDrawerMetadata({ meta }: DecisionDrawerMetadataProps) {
  const cost = estimateCost(meta.provider as Provider, meta.input_tokens, meta.output_tokens);

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-mono text-[10px] text-white/38 capitalize">{meta.provider}</span>
      <span className="font-mono text-[10px] text-white/30">·</span>
      <span className="font-mono text-[10px] text-white/38">{formatTs(meta.ts)}</span>
      <span className="font-mono text-[10px] text-white/30">·</span>
      <span className="font-mono text-[10px] text-white/38">
        {meta.input_tokens}/{meta.output_tokens}t
      </span>
      <span className="font-mono text-[10px] text-white/30">·</span>
      <span className="font-mono text-[10px] text-white/45">Est {formatCost(cost)}</span>
    </div>
  );
}
