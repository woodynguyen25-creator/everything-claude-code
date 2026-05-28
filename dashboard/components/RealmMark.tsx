import VegvisirSigil from '@/components/VegvisirSigil';

type Props = {
  size?: number;
  className?: string;
};

export default function RealmMark({ size = 24, className = '' }: Props) {
  return (
    <div className={`group inline-flex items-center justify-center ${className}`}>
      <VegvisirSigil
        size={size}
        className="text-text-muted transition-all duration-200 group-hover:text-rune-gold group-hover:drop-shadow-[0_0_6px_oklch(var(--color-rune-gold)_/_0.25)]"
      />
    </div>
  );
}
