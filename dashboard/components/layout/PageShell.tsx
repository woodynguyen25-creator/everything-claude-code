import type { ReactNode } from 'react';

export interface PageShellProps {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  /** Timestamp, filter pill, or any right-aligned content in the header row */
  rightSlot?: ReactNode;
  maxWidth?: number;
}

/**
 * Shared outer chrome for Olympus, Mission Control, and Memory pages.
 * Owns: dark bg, radial dot grid, gold glow gradient, max-width container.
 */
export function PageShell({
  children,
  title,
  eyebrow,
  rightSlot,
  maxWidth = 1800,
}: PageShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-deep px-4 py-8 text-text-primary sm:px-6 md:px-8 lg:px-10 xl:px-12">
      {/* Radial dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      />
      {/* Gold top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,_oklch(var(--color-rune-gold)_/_0.16),_transparent_62%)]"
      />

      <main
        className="relative z-10 mx-auto flex flex-col gap-5"
        style={{ maxWidth }}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <div className="text-[10px] uppercase tracking-[0.32em] text-text-muted">
                {eyebrow}
              </div>
            )}
            <h1 className="mt-2 font-display text-3xl uppercase tracking-wide text-rune-gold md:text-4xl">
              {title}
            </h1>
          </div>
          {rightSlot && <div>{rightSlot}</div>}
        </div>

        {children}
      </main>
    </div>
  );
}
