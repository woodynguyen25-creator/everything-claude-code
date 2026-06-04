'use client';

import Link from 'next/link';
import { useLiveResource } from '@/lib/useLiveResource';
import { ODYSSEUS_URL } from '@/lib/odysseus';

type Status = 'online' | 'offline' | 'checking';

// Home-page launch card for Odysseus — the door into the self-hosted AI
// workspace (every model, your memory, deep research), live on the Droplet
// and on mobile. Polls /api/odysseus-health for a live status pip.
export default function OdysseusGateway() {
  // Shares the /api/odysseus-health poll with the Sidebar's ConnectionsStrip via the spine.
  const { data, loading, error } = useLiveResource<{ status: string }>('/api/odysseus-health', {
    intervalMs: 30_000,
  });
  const status: Status = loading ? 'checking' : error ? 'offline' : data?.status === 'online' ? 'online' : 'offline';

  const live = status === 'online';

  return (
    <section className="mx-12 mt-4">
      {/* Portal threshold card — layered depth, mythic atmosphere */}
      <div className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-[#141228] via-bg-raised to-[#0f1320] p-6 transition-shadow duration-500 hover:border-rune-gold/30 hover:shadow-[0_0_48px_-16px_oklch(var(--color-rune-gold)/0.35)]">

        {/* faint starfield */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* bifröst aurora — primary right bloom */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(120,160,255,0.18),_transparent_65%)]"
        />
        {/* secondary gold bloom at threshold left — doorway warmth */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{ background: 'radial-gradient(circle, oklch(var(--color-rune-gold) / 0.14), transparent 65%)' }}
        />

        {/* Portal arc ornament — SVG compass rings in the background */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.055] group-hover:opacity-[0.10] transition-opacity duration-700"
        >
          <svg width="140" height="140" viewBox="0 0 140 140" fill="none" className="portal-arc">
            <circle cx="70" cy="70" r="62" stroke="oklch(var(--color-rune-gold))" strokeWidth="0.75" strokeDasharray="4 8" />
            <circle cx="70" cy="70" r="50" stroke="oklch(var(--color-bifrost))" strokeWidth="0.5" strokeDasharray="2 12" />
          </svg>
          <svg
            width="140" height="140" viewBox="0 0 140 140" fill="none"
            className="portal-arc-inner absolute inset-0"
          >
            <circle cx="70" cy="70" r="38" stroke="oklch(var(--color-rune-gold))" strokeWidth="0.5" strokeDasharray="3 14" />
          </svg>
          {/* Center sigil point */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="h-2 w-2 rounded-full"
              style={{
                background: 'oklch(var(--color-rune-gold) / 0.7)',
                boxShadow: '0 0 8px 2px oklch(var(--color-rune-gold) / 0.4)',
              }}
            />
          </div>
        </div>

        {/* Top threshold line — the "door lintel" */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rune-gold/50 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-rune text-[10px] tracking-[0.3em] text-text-muted">WORKSPACE · GATEWAY</span>
              <span
                className={`flex items-center gap-1 font-mono text-[9px] tracking-wider ${
                  live ? 'text-emerald-400' : 'text-text-muted'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-ember-pulse bg-emerald-400' : 'bg-text-muted'}`}
                />
                {status === 'checking' ? 'CHECKING' : live ? 'LIVE' : 'WARMING'}
              </span>
            </div>
            <h2
              className="mt-2 font-display text-2xl text-rune-gold"
              style={{ textShadow: '0 0 24px oklch(var(--color-rune-gold) / 0.3)' }}
            >
              Odysseus
            </h2>
            <p className="mt-1 max-w-xl text-sm text-text-secondary">
              Your self-hosted AI workspace — every model, your memory, deep research, and the
              council&apos;s tools. One door, on every device.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/odysseus"
              className="group/btn relative cursor-pointer overflow-hidden rounded-xl border border-rune-gold/40 bg-rune-gold/10 px-4 py-2 font-mono text-[11px] tracking-wider text-rune-gold transition-all hover:bg-rune-gold/20 hover:shadow-[0_0_28px_-6px_oklch(var(--color-rune-gold)/0.65)]"
            >
              {/* Button beam sweep on hover */}
              <span className="shimmer pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover/btn:opacity-100" />
              ⛵ ENTER WORKSPACE
            </Link>
            <a
              href={ODYSSEUS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 font-mono text-[11px] tracking-wider text-text-secondary transition-colors hover:border-bifrost hover:text-bifrost"
            >
              ↗ MOBILE
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
