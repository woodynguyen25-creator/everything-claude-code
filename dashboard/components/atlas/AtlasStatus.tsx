'use client';

import { useEffect, useState } from 'react';
import type { AtlasState, AtlasCheck } from '@/app/api/doctor/atlas/route';

const IGNORED_CHECKS = ['pc-dashboard']; // PC sleeps — expected to be intermittently down

function secondsToUptime(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function CheckRow({ check }: { check: AtlasCheck }) {
  const ignored = IGNORED_CHECKS.includes(check.name);
  const status = ignored ? 'ignored' : check.ok ? 'ok' : 'fail';
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-white/[0.05] last:border-0">
      <span className={`flex-shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest w-12 ${
        status === 'ok' ? 'text-emerald-400' : status === 'fail' ? 'text-rose-400' : 'text-white/25'
      }`}>
        {status === 'ok' ? 'ok' : status === 'fail' ? 'fail' : 'skip'}
      </span>
      <span className="text-[11px] text-white/70 font-mono w-52 flex-shrink-0">{check.name}</span>
      <span className="text-[11px] text-white/40 font-mono truncate">{check.detail}</span>
      {check.consecutive_failures > 0 && !ignored && (
        <span className="text-[10px] text-amber-300 ml-auto flex-shrink-0">
          {check.consecutive_failures} fail{check.consecutive_failures > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

export function AtlasStatus() {
  const [state, setState] = useState<AtlasState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [lastFetch, setLastFetch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/doctor/atlas', { cache: 'no-store' });
        if (!res.ok) return;
        const data: AtlasState = await res.json();
        if (!cancelled) {
          setState(data);
          setLastFetch(Date.now());
        }
      } catch {
        // silently ignore — Atlas absence shouldn't break the page
      }
    }
    load();
    const timer = window.setInterval(load, 30_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  if (!state) return null;

  const realChecks = (state.checks ?? []).filter(c => !IGNORED_CHECKS.includes(c.name));
  const failingChecks = realChecks.filter(c => !c.ok);
  const okCount = realChecks.filter(c => c.ok).length;
  const totalRestarts = Object.values(state.restarts_today ?? {}).reduce((a, b) => a + b, 0);
  const ageSec = lastFetch > 0 ? Math.round((Date.now() - lastFetch) / 1000) : 0;

  const isOffline = state.offline === true;
  const isHealthy = !isOffline && failingChecks.length === 0;

  return (
    <div className="w-full">
      {/* Status bar */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-colors ${
          isOffline
            ? 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
            : isHealthy
            ? 'border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.07]'
            : 'border-rose-500/30 bg-rose-500/[0.06] hover:bg-rose-500/[0.09]'
        }`}
        aria-expanded={expanded}
      >
        <span className="text-base flex-shrink-0" aria-hidden>🛡</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">Atlas</span>

        {isOffline ? (
          <span className="text-[11px] text-white/35 font-mono">· offline</span>
        ) : (
          <>
            <span className="text-[11px] text-white/45 font-mono">·</span>
            <span className={`text-[11px] font-mono font-semibold ${isHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isHealthy ? `${okCount}/${realChecks.length} ok` : `${failingChecks.length} failing`}
            </span>
            {totalRestarts > 0 && (
              <>
                <span className="text-[11px] text-white/30 font-mono">·</span>
                <span className="text-[11px] text-amber-300 font-mono">{totalRestarts} restart{totalRestarts > 1 ? 's' : ''} today</span>
              </>
            )}
            <span className="text-[11px] text-white/30 font-mono ml-auto">
              {secondsToUptime(state.uptime_seconds)} uptime · checked {ageSec}s ago
            </span>
            {!isHealthy && (
              <span className="text-[11px] text-rose-300 font-mono ml-2">
                ⚠ {failingChecks.map(c => c.name).join(', ')}
              </span>
            )}
          </>
        )}

        <span className={`text-white/30 text-xs ml-auto flex-shrink-0 ${isOffline ? '' : 'hidden'}`}
          aria-hidden>
          {expanded ? '▲' : '▼'}
        </span>
        {!isOffline && (
          <span className="text-white/30 text-xs flex-shrink-0" aria-hidden>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </button>

      {/* Expanded check list */}
      {expanded && !isOffline && state.checks.length > 0 && (
        <div className="mt-2 rounded-xl border border-white/[0.07] bg-[rgba(12,10,26,0.85)] px-4 py-3 backdrop-blur-xl">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-2">
            Atlas checks · keeper: {state.keeper_status}
          </div>
          {state.checks.map(check => (
            <CheckRow key={check.name} check={check} />
          ))}
        </div>
      )}
    </div>
  );
}
