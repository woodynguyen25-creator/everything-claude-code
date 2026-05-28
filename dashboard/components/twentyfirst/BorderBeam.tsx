'use client';

import type { ReactNode } from 'react';

export interface BorderBeamProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
  speed?: number;
  color?: string;
}

export function BorderBeam({
  children,
  active = true,
  className = '',
  speed = 5,
  color = '#C9A961',
}: BorderBeamProps) {
  if (!active) {
    return <div className={className}>{children}</div>;
  }

  const keyframeName = `bbspin${String(speed).replace('.', '_')}`;

  return (
    <div className={`relative rounded-xl ${className}`} style={{ padding: '1px' }}>
      <style>{`
        @keyframes ${keyframeName} {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
      {/* Spinning gradient — creates the glowing border */}
      <div className="absolute inset-0 overflow-hidden rounded-xl" aria-hidden>
        <div
          style={{
            position: 'absolute',
            inset: '-60px',
            background: `conic-gradient(from 0deg, transparent 60%, ${color}33 72%, ${color} 80%, ${color}88 84%, transparent 90%)`,
            animation: `${keyframeName} ${speed}s linear infinite`,
          }}
        />
      </div>
      {/* Dark fill masks the interior — only the 1px border strip shows the beam */}
      <div className="relative z-10 h-full w-full rounded-xl bg-[rgba(12,10,26,0.85)]">
        {children}
      </div>
    </div>
  );
}
