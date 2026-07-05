'use client';

import { useEffect, useState } from 'react';
import { useLiveResource } from '@/lib/useLiveResource';
import { ParticleOrb, type OrbTone } from '@/components/ParticleOrb';

type Health = { slug: string; status: 'ok' | 'fallback' | 'offline' };
type Olympus = { equity_source?: 'live' | 'sample' };

function useSystemTone(): { tone: OrbTone; council: string; droplet: string } {
  // Shared polling spine — CommandTiles already hits both URLs, so these dedupe.
  const health = useLiveResource<Health[]>('/api/doctor/agents', { intervalMs: 60_000 });
  const olympus = useLiveResource<Olympus>('/api/olympus/state', { intervalMs: 60_000 });

  const agents = health.data ?? [];
  const offline = agents.filter((a) => a.status === 'offline').length;
  const fallback = agents.filter((a) => a.status === 'fallback').length;
  const okCount = agents.filter((a) => a.status === 'ok').length;

  // Orb color IS system state: fault > degraded > all-clear.
  const tone: OrbTone = offline > 0 ? 'blood' : fallback > 0 ? 'ember' : 'gold';
  const council = agents.length ? `${okCount}/${agents.length}` : '—';
  const droplet = olympus.data ? (olympus.data.equity_source === 'live' ? 'LIVE' : 'MOCK') : '—';
  return { tone, council, droplet };
}

/** The hero's ambient brain — particle orb tinted by live system state. */
export function HeroOrb() {
  const { tone } = useSystemTone();
  return <ParticleOrb tone={tone} />;
}

const DOT_TONE: Record<OrbTone, string> = {
  gold: 'bg-rune-gold',
  emerald: 'bg-emerald',
  ember: 'bg-ember',
  blood: 'bg-blood',
};

/** V.A.U.L.T.-style live clock + system status strip for the hero's top-left. */
export function HeroPulse() {
  const { tone, council, droplet } = useSystemTone();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Client-only clock — avoids SSR hydration mismatch.
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hm = now
    ? now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const sec = now ? String(now.getSeconds()).padStart(2, '0') : '--';

  return (
    <div className="select-none">
      {/* Clock — one quiet cinematic instrument, seconds de-emphasized */}
      <div className="font-numeric text-3xl tracking-tight text-text-primary tabular-nums">
        {hm}
        <span className="text-xl text-rune-gold/60">:{sec}</span>
      </div>
      {/* Status strip — mono micro-labels, breathing state dot */}
      <div className="mt-1.5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.22em] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className={`h-1 w-1 animate-pulse rounded-full ${DOT_TONE[tone]}`} />
          Council {council}
        </span>
        <span className="text-text-muted/40">·</span>
        <span>Droplet {droplet}</span>
      </div>
    </div>
  );
}
