'use client';

import { useLiveResource } from '@/lib/useLiveResource';

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
  // Shared spine: this Sidebar strip and the home OdysseusGateway both poll
  // /api/odysseus-health, so the hook fetches it once instead of twice per 30s.
  const dropletR = useLiveResource<{ status: string }>('/api/droplet-health', { intervalMs: POLL_INTERVAL });
  const odysseusR = useLiveResource<{ status: string }>('/api/odysseus-health', { intervalMs: POLL_INTERVAL });

  const toStatus = (r: { loading: boolean; error: string | null; data: { status: string } | null }): LiveStatus =>
    r.loading ? 'checking' : r.error ? 'offline' : normalize(r.data?.status ?? '');
  const droplet = toStatus(dropletR);
  const odysseus = toStatus(odysseusR);
  const refresh = () => {
    dropletR.refresh();
    odysseusR.refresh();
  };

  const lastMs = Math.max(dropletR.lastUpdated, odysseusR.lastUpdated);
  const lastChecked = lastMs ? new Date(lastMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

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
        onClick={refresh}
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
        onClick={refresh}
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
