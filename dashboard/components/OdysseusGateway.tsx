'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ODYSSEUS_URL } from '@/lib/odysseus';

type Status = 'online' | 'offline' | 'checking';

// Home-page launch card for Odysseus — the door into the self-hosted AI
// workspace (every model, your memory, deep research), live on the Droplet
// and on mobile. Polls /api/odysseus-health for a live status pip.
export default function OdysseusGateway() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch('/api/odysseus-health', { cache: 'no-store' });
        const data = (await res.json()) as { status: string };
        if (active) setStatus(data.status === 'online' ? 'online' : 'offline');
      } catch {
        if (active) setStatus('offline');
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const live = status === 'online';

  return (
    <section className="mx-12 mt-4">
      <div className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-[#141228] via-bg-raised to-[#0f1320] p-6">
        {/* faint starfield */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* bifröst aurora */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(120,160,255,0.18),_transparent_65%)]"
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
            <h2 className="mt-2 font-display text-2xl text-rune-gold">Odysseus</h2>
            <p className="mt-1 max-w-xl text-sm text-text-secondary">
              Your self-hosted AI workspace — every model, your memory, deep research, and the
              council&apos;s tools. One door, on every device.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/odysseus"
              className="cursor-pointer rounded-xl border border-rune-gold/40 bg-rune-gold/10 px-4 py-2 font-mono text-[11px] tracking-wider text-rune-gold transition-all hover:bg-rune-gold/20 hover:shadow-[0_0_24px_-6px_oklch(var(--color-rune-gold)/0.6)]"
            >
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
