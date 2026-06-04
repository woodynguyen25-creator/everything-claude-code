'use client';

import { useEffect, useState } from 'react';

type LiveStatus = 'online' | 'offline' | 'degraded' | 'checking';

const STATIC_CONNECTIONS = [
  { id: 'github',      label: 'GitHub',       mark: 'GH' },
  { id: 'playwright',  label: 'Playwright',    mark: 'PW' },
  { id: 'exa',         label: 'Exa',           mark: 'EX' },
  { id: 'firecrawl',   label: 'Firecrawl',     mark: 'FC' },
  { id: 'context7',    label: 'Context7',      mark: 'C7' },
  { id: 'fal',         label: 'fal.ai',        mark: 'FA' },
  { id: 'obsidian',    label: 'Obsidian',      mark: 'OB' },
  { id: 'tradingview', label: 'TradingView',   mark: 'TV' },
];

const STATUS_STYLES: Record<LiveStatus, string> = {
  online:   'border-emerald-500/60 bg-emerald-500/10 text-emerald-400',
  degraded: 'border-amber-500/60  bg-amber-500/10  text-amber-400',
  offline:  'border-red-500/60    bg-red-500/10    text-red-400',
  checking: 'border-border-subtle bg-bg-deep       text-text-muted animate-pulse',
};

const STATUS_DOTS: Record<LiveStatus, string> = {
  online:   'bg-emerald-400',
  degraded: 'bg-amber-400',
  offline:  'bg-red-500',
  checking: 'bg-text-muted',
};

const POLL_INTERVAL = 30_000; // 30s

function normalize(raw: string): LiveStatus {
  return raw === 'online' ? 'online' : raw === 'degraded' ? 'degraded' : 'offline';
}

export default function ConnectionsStrip() {
  const [droplet, setDroplet] = useState<LiveStatus>('checking');
  const [odysseus, setOdysseus] = useState<LiveStatus>('checking');
  const [lastChecked, setLastChecked] = useState<string>('');

  const check = async () => {
    try {
      const res = await fetch('/api/droplet-health', { cache: 'no-store' });
      setDroplet(res.ok ? normalize(((await res.json()) as { status: string }).status) : 'offline');
    } catch {
      setDroplet('offline');
    }
    try {
      const res = await fetch('/api/odysseus-health', { cache: 'no-store' });
      setOdysseus(res.ok ? normalize(((await res.json()) as { status: string }).status) : 'offline');
    } catch {
      setOdysseus('offline');
    }
    setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const dropletTitle =
    droplet === 'online'   ? `Hermes Droplet — online (Tailscale) · ${lastChecked}` :
    droplet === 'degraded' ? `Hermes Droplet — degraded · ${lastChecked}` :
    droplet === 'offline'  ? `Hermes Droplet — offline (Tailscale disconnected?) · ${lastChecked}` :
    'Hermes Droplet — checking…';

  const odysseusTitle =
    odysseus === 'online'  ? `Odysseus workspace — online · ${lastChecked}` :
    odysseus === 'offline' ? `Odysseus workspace — offline (enable Tailscale Serve / wake Droplet) · ${lastChecked}` :
    'Odysseus workspace — checking…';

  return (
    <div className="space-y-2">
      {/* Live Tailscale / Droplet status */}
      <button
        type="button"
        onClick={check}
        title={dropletTitle}
        className={`flex w-full items-center gap-2 rounded border px-2.5 py-1.5 transition-colors ${STATUS_STYLES[droplet]}`}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOTS[droplet]} ${droplet === 'online' ? 'animate-ember-pulse' : ''}`}
        />
        <span className="font-mono text-[10px] font-medium tracking-wide">
          Tailscale · {droplet === 'checking' ? '…' : droplet.toUpperCase()}
        </span>
        <span className="ml-auto font-mono text-[9px] opacity-60">{lastChecked || '—'}</span>
      </button>

      {/* Live Odysseus workspace status */}
      <button
        type="button"
        onClick={check}
        title={odysseusTitle}
        className={`flex w-full items-center gap-2 rounded border px-2.5 py-1.5 transition-colors ${STATUS_STYLES[odysseus]}`}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOTS[odysseus]} ${odysseus === 'online' ? 'animate-ember-pulse' : ''}`}
        />
        <span className="font-mono text-[10px] font-medium tracking-wide">
          🧭 Odysseus · {odysseus === 'checking' ? '…' : odysseus.toUpperCase()}
        </span>
      </button>

      {/* Static MCP connection marks */}
      <div className="grid grid-cols-4 gap-1.5">
        {STATIC_CONNECTIONS.map((connection) => (
          <div
            key={connection.id}
            title={connection.label}
            className="flex h-7 items-center justify-center rounded border border-border-subtle bg-bg-deep text-[10px] font-mono text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            {connection.mark}
          </div>
        ))}
      </div>
    </div>
  );
}
