'use client';

const NODES = ['COUNCIL', 'ANUBIS', 'THOR', 'EXECUTION'] as const;

export function CouncilFlowBeam() {
  return (
    <>
      <style>{`
        @keyframes cfb-sweep {
          0%   { transform: translateX(-100%) translateY(-50%); opacity: 0; }
          3%   { opacity: 1; }
          30%  { transform: translateX(400%) translateY(-50%); opacity: 1; }
          31%  { opacity: 0; transform: translateX(400%) translateY(-50%); }
          32%  { transform: translateX(-100%) translateY(-50%); opacity: 0; }
          100% { transform: translateX(-100%) translateY(-50%); opacity: 0; }
        }
        .cfb-sweep {
          animation: cfb-sweep 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>

      <div className="relative flex items-center overflow-hidden rounded-xl border border-white/[0.04] bg-white/[0.015] px-6 py-2.5">
        {/* Single beam traveling left → right */}
        <div
          aria-hidden
          className="cfb-sweep pointer-events-none absolute top-1/2 h-[1px] w-1/4"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, oklch(var(--color-rune-gold) / 0.5) 20%, oklch(var(--color-rune-gold)) 50%, oklch(var(--color-rune-gold) / 0.5) 80%, transparent 100%)',
            filter: 'blur(0.5px)',
          }}
        />

        {NODES.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            {/* Node dot + label */}
            <div className="relative flex shrink-0 flex-col items-center gap-1.5">
              <div
                className="h-1.5 w-1.5 rounded-full bg-rune-gold"
                style={{ boxShadow: '0 0 6px oklch(var(--color-rune-gold) / 0.4)' }}
              />
              <span className="font-mono text-[8px] tracking-[0.22em] text-text-muted">
                {label}
              </span>
            </div>

            {/* Connecting line */}
            {i < NODES.length - 1 && (
              <div className="mx-3 flex-1">
                <div className="h-[1px] w-full bg-white/[0.07]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
