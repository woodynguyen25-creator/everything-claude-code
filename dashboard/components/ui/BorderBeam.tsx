import type { CSSProperties } from 'react';

type BorderBeamProps = {
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
};

export function BorderBeam({
  duration = 8,
  colorFrom = 'oklch(var(--color-rune-gold) / 0)',
  colorTo = 'oklch(var(--color-rune-gold) / 0.5)',
}: BorderBeamProps) {
  return (
    <div
      className="border-beam pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      style={
        {
          '--beam-duration': `${duration}s`,
          '--beam-color-from': colorFrom,
          '--beam-color-to': colorTo,
        } as CSSProperties
      }
    />
  );
}
