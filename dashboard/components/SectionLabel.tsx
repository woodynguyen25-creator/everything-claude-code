type Props = { label: string; meta?: string; className?: string };

export default function SectionLabel({ label, meta, className = '' }: Props) {
  return (
    <div className={`mx-12 mt-12 mb-3 flex items-baseline gap-4 ${className}`.trim()}>
      <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">{label}</div>
      <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
      {meta ? <div className="font-mono text-[10px] text-text-muted">{meta}</div> : null}
    </div>
  );
}
