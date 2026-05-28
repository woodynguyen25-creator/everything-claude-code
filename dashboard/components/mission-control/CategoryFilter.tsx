'use client';

type Category = 'all' | 'aios' | 'olympus' | 'trading';

type CategoryFilterProps = {
  value: Category;
  onChange: (value: Category) => void;
};

const OPTIONS: Array<{ value: Category; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'aios', label: 'AIOS' },
  { value: 'olympus', label: 'Olympus' },
  { value: 'trading', label: 'Trading' },
];

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition-colors ${
            value === option.value
              ? 'border-rune-gold bg-rune-gold/15 text-rune-gold'
              : 'border-white/[0.08] bg-white/[0.03] text-white/55 hover:text-white/80'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
