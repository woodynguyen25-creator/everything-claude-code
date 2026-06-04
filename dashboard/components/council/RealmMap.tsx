'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CouncilDomain } from '@/lib/council-roster';
import { accentClasses } from './accents';
import type { HealthStatus } from './CouncilAgentCard';

type NodeState = 'live' | 'warn' | 'down' | 'auto';

type MapNode = {
  id: string;
  label: string;
  sub: string;
  emoji: string;
  x: number;
  y: number;
  accentOklch: string;
  state: NodeState;
  /** dom id to scroll to on click, if any */
  anchor: string | null;
};

type Props = {
  domains: CouncilDomain[];
  healthMap: Record<string, HealthStatus>;
  dreams: string[];
};

const HUB = { x: 440, y: 235 };

const DOMAIN_POS: Record<string, { x: number; y: number }> = {
  trading: { x: 168, y: 150 },
  research: { x: 712, y: 150 },
  'lucky-dog': { x: 168, y: 330 },
  code: { x: 712, y: 330 },
};

function domainState(domain: CouncilDomain, healthMap: Record<string, HealthStatus>): NodeState {
  const tracked = domain.members.filter((m) => m.healthSlug);
  if (tracked.length === 0) return 'auto';
  const statuses = tracked.map((m) => healthMap[m.healthSlug as string] ?? null);
  if (statuses.some((s) => s === 'offline')) return 'down';
  if (statuses.some((s) => s === 'fallback' || s === null)) return 'warn';
  return 'live';
}

function stateColor(state: NodeState, accentOklch: string): string {
  if (state === 'warn') return '#fbbf24';
  if (state === 'down') return '#f43f5e';
  return accentOklch; // live + auto use the domain accent
}

export function RealmMap({ domains, healthMap, dreams }: Props) {
  const [dreamIdx, setDreamIdx] = useState(0);

  useEffect(() => {
    if (dreams.length <= 1) return;
    const t = window.setInterval(() => setDreamIdx((i) => (i + 1) % dreams.length), 5200);
    return () => window.clearInterval(t);
  }, [dreams.length]);

  const nodes = useMemo<MapNode[]>(() => {
    const list: MapNode[] = [];

    // service nodes (steady)
    list.push({ id: 'droplet', label: 'Droplet', sub: 'always-on host', emoji: '🌩️', x: 440, y: 70, accentOklch: 'oklch(var(--color-bifrost))', state: 'auto', anchor: null });
    list.push({ id: 'memory', label: 'Mímir', sub: 'memory & recall', emoji: '🧠', x: 440, y: 405, accentOklch: 'oklch(var(--color-rune-gold))', state: 'auto', anchor: null });

    for (const d of domains) {
      if (d.key === 'command') continue;
      const pos = DOMAIN_POS[d.key];
      if (!pos) continue;
      const lead = d.members[0];
      list.push({
        id: d.key,
        label: d.label,
        sub: lead ? lead.loreName : d.tagline,
        emoji: lead ? lead.emoji : '◆',
        x: pos.x,
        y: pos.y,
        accentOklch: accentClasses(d.accent).oklch,
        state: domainState(d, healthMap),
        anchor: `domain-${d.key}`,
      });
    }
    return list;
  }, [domains, healthMap]);

  const scrollTo = (anchor: string | null) => {
    if (!anchor) return;
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-deep">
      {/* faint grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(oklch(var(--color-border-subtle)/0.25) 1px, transparent 1px), linear-gradient(90deg, oklch(var(--color-border-subtle)/0.25) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <svg viewBox="0 0 880 470" className="relative w-full" role="img" aria-label="Realm topology map">
        {/* edges hub → every node */}
        {nodes.map((n) => {
          const color = stateColor(n.state, n.accentOklch);
          const animated = n.state === 'live' || n.state === 'auto';
          return (
            <line
              key={`edge-${n.id}`}
              x1={HUB.x}
              y1={HUB.y}
              x2={n.x}
              y2={n.y}
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={n.state === 'down' ? 0.25 : 0.5}
              className={animated ? 'realm-edge' : undefined}
            />
          );
        })}

        {/* hub — command */}
        <g
          className="cursor-pointer"
          onClick={() => scrollTo('domain-command')}
          role="button"
          aria-label="Command & Guardian"
        >
          <circle className="realm-node-halo" cx={HUB.x} cy={HUB.y} r={56} fill="oklch(var(--color-rune-gold))" opacity={0.18} />
          <circle cx={HUB.x} cy={HUB.y} r={40} fill="oklch(var(--color-bg-panel))" stroke="oklch(var(--color-rune-gold))" strokeWidth={2} />
          <text x={HUB.x} y={HUB.y - 2} textAnchor="middle" fontSize={26}>👑</text>
          <text x={HUB.x} y={HUB.y + 20} textAnchor="middle" fontSize={9} fontWeight={700} letterSpacing={2} fill="oklch(var(--color-rune-gold))">COMMAND</text>
        </g>

        {/* satellite nodes */}
        {nodes.map((n) => {
          const color = stateColor(n.state, n.accentOklch);
          return (
            <g
              key={`node-${n.id}`}
              className={n.anchor ? 'cursor-pointer' : ''}
              onClick={() => scrollTo(n.anchor)}
              role={n.anchor ? 'button' : undefined}
              aria-label={n.label}
            >
              {(n.state === 'live' || n.state === 'auto') && (
                <circle className="realm-node-halo" cx={n.x} cy={n.y} r={42} fill={color} opacity={0.16} />
              )}
              {n.state === 'down' && (
                <circle cx={n.x} cy={n.y} r={36} fill="none" stroke="#f43f5e" strokeWidth={1.5} strokeOpacity={0.6} />
              )}
              <circle cx={n.x} cy={n.y} r={30} fill="oklch(var(--color-bg-panel))" stroke={color} strokeWidth={1.75} strokeOpacity={n.state === 'down' ? 0.5 : 1} />
              <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize={20}>{n.emoji}</text>
              <text x={n.x} y={n.y + 50} textAnchor="middle" fontSize={9.5} fontWeight={700} letterSpacing={1.5} fill={color}>{n.label}</text>
              <text x={n.x} y={n.y + 64} textAnchor="middle" fontSize={9} fill="oklch(var(--color-text-muted))">{n.sub}</text>
            </g>
          );
        })}
      </svg>

      {/* whispered dream caption */}
      <div className="border-t border-border-subtle px-5 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-muted">the realm dreams · </span>
        <span key={dreamIdx} className="text-[12px] italic text-text-secondary animate-[home-fade-up_500ms_ease-out]">
          {dreams.length ? dreams[dreamIdx] : 'quietly tonight.'}
        </span>
      </div>
    </div>
  );
}
