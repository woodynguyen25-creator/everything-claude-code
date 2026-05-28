'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AgentCard from '@/components/AgentCard';
import ConnectionsStrip from '@/components/ConnectionsStrip';
import RealmMark from '@/components/RealmMark';
import type { AgentStatus } from '@/lib/agent-status';

type HealthStatus = 'ok' | 'fallback' | 'offline';
type HealthMap = Record<string, HealthStatus>;

type SidebarProps = {
  agentStatuses: AgentStatus[];
  operatorDateLabel: string;
};

type NavItem = { href: string; label: string };

const OLYMPUS_PANTHEON = [
  { slug: 'anubis', emoji: '⚖️', codename: 'ANUBIS', role: 'Chairman' },
  { slug: 'zeus', emoji: '⚡', codename: 'ZEUS', role: 'Macro' },
  { slug: 'apollo', emoji: '☀️', codename: 'APOLLO', role: 'Bull' },
  { slug: 'athena', emoji: '🦉', codename: 'ATHENA', role: 'Bear' },
  { slug: 'ares', emoji: '⚔️', codename: 'ARES', role: 'Catalyst' },
  { slug: 'loki', emoji: '🔥', codename: 'LOKI', role: 'Red Team' },
  { slug: 'poseidon', emoji: '🌊', codename: 'POSEIDON', role: 'Risk' },
  { slug: 'artemis', emoji: '🏹', codename: 'ARTEMIS', role: 'Scanner' },
  { slug: 'hephaestus', emoji: '🔨', codename: 'HEPHAESTUS', role: 'Resolver' },
  { slug: 'hades', emoji: '💀', codename: 'HADES', role: 'Janitor' },
  { slug: 'calliope', emoji: '🎭', codename: 'CALLIOPE', role: 'Reporter' },
];

const TRADING_BOTS = [
  { slug: 'hermes-btc', emoji: '₿', codename: 'HERMES BTC', status: 'paper' },
  { slug: 'hermes-eth', emoji: 'Ξ', codename: 'HERMES ETH', status: 'paper' },
  { slug: 'hermes-spy', emoji: '🇺🇸', codename: 'HERMES SPY', status: 'paper' },
  { slug: 'parlay', emoji: '🎲', codename: 'PARLAYBOT', status: 'idle' },
];

const NAV: NavItem[] = [
  { href: '/', label: '🏛️ Home' },
  { href: '/activity', label: '📊 Activity' },
  { href: '/memory', label: '🧠 Memory' },
  { href: '/trading', label: '💹 Trading' },
  { href: '/olympus', label: '⚡ Olympus Fund' },
  { href: '/mission-control', label: '🎛️ Mission Control' },
  { href: '/hermes', label: '🪶 Hermes' },
  { href: '/skills', label: '🛠️ Skills' },
];

export default function Sidebar({ agentStatuses, operatorDateLabel }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const [healthMap, setHealthMap] = useState<HealthMap>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/doctor/agents', { cache: 'no-store' });
        const data = await res.json() as Array<{ slug: string; status: HealthStatus }>;
        if (!cancelled) {
          const map: HealthMap = {};
          data.forEach((d) => { map[d.slug] = d.status; });
          setHealthMap(map);
        }
      } catch {
        // fail silently — dots just won't render
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <aside className="relative z-20 flex min-h-screen w-72 shrink-0 flex-col border-r border-border-subtle bg-bg-panel">
      <div className="border-b border-border-subtle px-5 py-6">
        <div className="flex items-start gap-3">
          <RealmMark size={24} className="shrink-0" />
          <div>
            <div className="font-display text-2xl uppercase tracking-[0.2em] text-rune-gold">Woody&apos;s Realm</div>
            <div className="mt-1 font-mono text-[11px] text-text-muted">Operator · {operatorDateLabel}</div>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('ravens:open', { detail: {} }))}
            aria-label="Open the Ravens"
            className="ml-auto rounded-full border border-border-subtle bg-bg-panel px-3 py-2 font-numeric text-[11px] text-text-muted transition-colors hover:border-rune-gold hover:text-rune-gold"
            title="Open the Ravens"
          >
            ⌘K
          </button>
        </div>
      </div>

      <nav className="px-3 py-5">
        <div className="mb-2 px-2 text-rune text-[10px] tracking-[0.3em] text-text-muted">NAV</div>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded border-l-2 px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'border-rune-gold bg-bg-hover text-text-primary'
                      : 'border-l-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-2 flex-1 overflow-y-auto px-3">
        <div className="mb-2 px-2 text-rune text-[10px] tracking-[0.3em] text-text-muted">COUNCIL</div>
        <ul className="space-y-2">
          {agentStatuses.map((agent) => (
            <li key={agent.slug}>
              <AgentCard
                href={agent.href}
                codename={agent.codename}
                persona={agent.persona}
                accent={agent.accent}
                tone={agent.tone}
                symbol={agent.symbol}
                imageSrc={agent.imageSrc}
                active={isActive(agent.href)}
                healthStatus={healthMap[agent.slug] ?? null}
              />
            </li>
          ))}
        </ul>

        <div className="mt-4">
          <div className="mb-2 px-2 text-rune text-[10px] tracking-[0.3em] text-text-muted">⚡ OLYMPUS COUNCIL</div>
          <ul className="space-y-1">
            {OLYMPUS_PANTHEON.map((agent) => (
              <li key={agent.slug}>
                <Link
                  href={`/olympus?agent=${agent.slug}`}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-[12px] text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  <span className="text-base">{agent.emoji}</span>
                  <span className="font-mono uppercase tracking-wider">{agent.codename}</span>
                  <span className="ml-auto text-[10px] text-text-muted">{agent.role}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 mb-4">
          <div className="mb-2 px-2 text-rune text-[10px] tracking-[0.3em] text-text-muted">🤖 TRADING BOTS</div>
          <ul className="space-y-1">
            {TRADING_BOTS.map((bot) => (
              <li key={bot.slug}>
                <Link
                  href={`/olympus?bot=${bot.slug}`}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-[12px] text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  <span className="text-base">{bot.emoji}</span>
                  <span className="font-mono uppercase tracking-wider">{bot.codename}</span>
                  <span className="ml-auto text-[10px] text-text-muted">{bot.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border-subtle px-5 py-4 text-[10px] text-text-muted">
        <div className="mb-3">
          <ConnectionsStrip />
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-bifrost animate-ember-pulse" />
          <span>localhost:3737</span>
        </div>
      </div>
    </aside>
  );
}
