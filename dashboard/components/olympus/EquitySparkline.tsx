'use client';

import { useMemo, useState } from 'react';
import type { EquityPoint } from '@/lib/olympus/types';

type EquitySparklineProps = {
  points: EquityPoint[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
  });
}

export function EquitySparkline({ points }: EquitySparklineProps) {
  const [hovered, setHovered] = useState<EquityPoint | null>(null);
  const viewBox = { width: 420, height: 96, pad: 10 };

  const spark = useMemo(() => {
    const safePoints = points.slice(-30);
    const values = safePoints.map((point) => point.equity);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const innerWidth = viewBox.width - viewBox.pad * 2;
    const innerHeight = viewBox.height - viewBox.pad * 2;

    const mapped = safePoints.map((point, index) => {
      const x = viewBox.pad + (index / Math.max(safePoints.length - 1, 1)) * innerWidth;
      const y = viewBox.pad + (1 - (point.equity - min) / range) * innerHeight;
      return { point, x, y };
    });

    const path = mapped.map((item, index) => `${index === 0 ? 'M' : 'L'} ${item.x.toFixed(2)} ${item.y.toFixed(2)}`).join(' ');
    const last = mapped[mapped.length - 1];
    const firstValue = mapped[0]?.point.equity ?? 0;
    const lastValue = last?.point.equity ?? 0;
    const fillPath = `${path} L ${last?.x ?? viewBox.pad} ${viewBox.height - viewBox.pad} L ${viewBox.pad} ${viewBox.height - viewBox.pad} Z`;

    return {
      mapped,
      path,
      fillPath,
      last,
      positive: lastValue >= firstValue,
    };
  }, [points]);

  const stroke = spark.positive ? '#22C55E' : '#F43F5E';
  const fill = spark.positive ? '#22C55E22' : '#F43F5E22';
  const visibleTooltip = hovered ?? spark.last?.point ?? null;

  return (
    <div className="relative h-full min-h-24 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.24em] text-white/40">Equity curve</span>
        {visibleTooltip ? (
          <span className="font-mono text-[10px] text-white/55">
            {formatTime(visibleTooltip.ts)} / {formatCurrency(visibleTooltip.equity)}
          </span>
        ) : null}
      </div>
      <svg
        role="img"
        aria-label="Olympus equity sparkline"
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        className="h-20 w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="olympus-equity-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={fill} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path d={spark.fillPath} fill="url(#olympus-equity-fill)" />
        <path d={spark.path} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {spark.mapped.map(({ point, x, y }) => (
          <circle
            key={`${point.ts}-${point.equity}`}
            cx={x}
            cy={y}
            r="9"
            fill="transparent"
            onMouseEnter={() => setHovered(point)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {spark.last ? (
          <circle cx={spark.last.x} cy={spark.last.y} r="4.5" fill={stroke} stroke="#0D0B1A" strokeWidth="2" />
        ) : null}
      </svg>
    </div>
  );
}
