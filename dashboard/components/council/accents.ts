import type { CouncilAccent } from '@/lib/council-roster';

export type AccentClasses = {
  text: string;
  borderL: string;
  ring: string;
  dot: string;
  glow: string;
  /** oklch value usable in inline styles / SVG */
  oklch: string;
};

export function accentClasses(accent: CouncilAccent): AccentClasses {
  switch (accent) {
    case 'bifrost':
      return { text: 'text-bifrost', borderL: 'border-l-bifrost', ring: 'ring-bifrost/40', dot: 'bg-bifrost', glow: 'shadow-[0_0_24px_-6px_oklch(var(--color-bifrost)/0.55)]', oklch: 'oklch(var(--color-bifrost))' };
    case 'blood':
      return { text: 'text-blood', borderL: 'border-l-blood', ring: 'ring-blood/40', dot: 'bg-blood', glow: 'shadow-[0_0_24px_-6px_oklch(var(--color-blood)/0.55)]', oklch: 'oklch(var(--color-blood))' };
    case 'emerald':
      return { text: 'text-emerald', borderL: 'border-l-emerald', ring: 'ring-emerald/40', dot: 'bg-emerald', glow: 'shadow-[0_0_24px_-6px_oklch(var(--color-perseus-emerald)/0.55)]', oklch: 'oklch(var(--color-perseus-emerald))' };
    case 'fire':
      return { text: 'text-fire', borderL: 'border-l-fire', ring: 'ring-fire/40', dot: 'bg-fire', glow: 'shadow-[0_0_24px_-6px_oklch(var(--color-sauron-fire)/0.55)]', oklch: 'oklch(var(--color-sauron-fire))' };
    case 'iron':
      return { text: 'text-iron', borderL: 'border-l-iron', ring: 'ring-white/20', dot: 'bg-iron', glow: 'shadow-[0_0_20px_-8px_rgba(255,255,255,0.4)]', oklch: 'oklch(var(--color-iron))' };
    case 'gold':
    default:
      return { text: 'text-rune-gold', borderL: 'border-l-rune-gold', ring: 'ring-rune-gold/40', dot: 'bg-rune-gold', glow: 'shadow-[0_0_24px_-6px_oklch(var(--color-rune-gold)/0.55)]', oklch: 'oklch(var(--color-rune-gold))' };
  }
}
