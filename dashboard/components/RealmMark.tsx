import VegvisirSigil from '@/components/VegvisirSigil';

type Props = {
  size?: number;
  className?: string;
};

export default function RealmMark({ size = 24, className = '' }: Props) {
  // The glow ring sits behind the sigil — slightly larger, fully blurred,
  // softly pulsing with sigil-glow-pulse from globals.css
  const ringSize = Math.round(size * 1.8);

  return (
    <div className={`group relative inline-flex items-center justify-center ${className}`}>
      {/* Faint breathing glow ring — compositor only (opacity + transform) */}
      <span
        aria-hidden
        className="sigil-glow-ring pointer-events-none absolute rounded-full"
        style={{
          width: ringSize,
          height: ringSize,
          background: `radial-gradient(circle, oklch(var(--color-rune-gold) / 0.22), transparent 70%)`,
          filter: 'blur(6px)',
        }}
      />
      <VegvisirSigil
        size={size}
        className="relative z-10 text-text-muted transition-all duration-300 group-hover:text-rune-gold group-hover:drop-shadow-[0_0_8px_oklch(var(--color-rune-gold)_/_0.35)]"
      />
    </div>
  );
}
