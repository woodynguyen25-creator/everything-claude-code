'use client';

import type { WhaleFlowItem } from '@/lib/olympus/types';

interface MarqueeFlowProps {
  items: WhaleFlowItem[];
  speed?: number; // seconds for one full loop
}

function compact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function MarqueeFlow({ items, speed = 45 }: MarqueeFlowProps) {
  if (items.length === 0) return null;

  const visible = items.slice(0, 10);

  return (
    <>
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .mq-inner {
          animation: marquee-scroll ${speed}s linear infinite;
          width: max-content;
        }
        .mq-inner:hover { animation-play-state: paused; }
      `}</style>
      <div className="relative overflow-hidden py-1.5">
        {/* Edge fades */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6"
          style={{ background: 'linear-gradient(to right, rgba(12,10,26,0.95), transparent)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6"
          style={{ background: 'linear-gradient(to left, rgba(12,10,26,0.95), transparent)' }}
        />
        <div className="mq-inner flex items-center gap-5">
          {/* Duplicate set for seamless loop */}
          {[...visible, ...visible].map((item, i) => (
            <span
              key={`${item.id}-${i}`}
              className="flex shrink-0 items-center gap-1.5 font-mono text-[10px]"
            >
              <span className="font-bold tracking-wide text-white">{item.ticker}</span>
              <span
                className={`uppercase tracking-[0.14em] ${
                  item.right === 'call' ? 'text-[#C9A961]' : 'text-rose-300'
                }`}
              >
                {item.right}
              </span>
              <span className="text-white/45">${item.strike}</span>
              <span className="text-white/70">{compact(item.premium)}</span>
              <span className="text-white/18 select-none">·</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
