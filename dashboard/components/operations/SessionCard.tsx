'use client';

import { useEffect, useRef, useState } from 'react';
import type { Heartbeat } from './sessionFormat';
import { styleFor, relTime, isStale, isAlive } from './sessionFormat';

// A live Claude Code session, rendered from its heartbeat. "Alive" sessions
// (active / working) get a breathing accent line + soft glow so the board reads
// like a living room of workers. Troubled sessions (blocked / down) expose an
// Escalate action that pages LeBot James on Telegram.
export function SessionCard({ s }: { s: Heartbeat }) {
  const st = styleFor(s.status);
  const alive = isAlive(s.status);
  const needsAttention = s.status === 'blocked' || s.status === 'error';
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const mounted = useRef(true);
  const toastTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      mounted.current = false;
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  async function escalate() {
    setBusy(true);
    try {
      const res = await fetch('/api/sessions/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: s.session, persona: s.persona, status: s.status, focus: s.focus }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (mounted.current) setToast(data.ok ? 'Paged LeBot ✓' : data.error ?? 'Failed');
    } catch {
      if (mounted.current) setToast('Failed');
    } finally {
      if (mounted.current) setBusy(false);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => {
        if (mounted.current) setToast(null);
      }, 2600);
    }
  }

  return (
    <article
      className={`relative overflow-hidden rounded-lg border ${st.border} bg-bg-panel/60 p-3 ${alive ? st.glow : ''}`}
    >
      {alive && (
        <span aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-px ${st.dot} animate-ember-pulse`} />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            {s.icon}
          </span>
          <span className="font-display text-sm text-text-primary">{s.persona}</span>
        </div>
        <span className={`flex items-center gap-1.5 font-mono text-[10px] ${st.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot} ${alive ? 'animate-ember-pulse' : ''}`} />
          {st.label}
        </span>
      </div>

      <div className="mt-2 text-[13px] text-text-secondary">{s.focus}</div>
      {s.last_output && <div className="mt-1 truncate font-mono text-[11px] text-text-muted">└ {s.last_output}</div>}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-text-muted">
          {relTime(s.ts)}
          {isStale(s.ts) ? ' · stale' : ''}
        </span>
        {needsAttention ? (
          <button
            type="button"
            onClick={escalate}
            disabled={busy}
            className="shrink-0 rounded-md border border-amber-500/40 px-2 py-0.5 font-mono text-[10px] text-amber-300 transition-colors hover:border-amber-400 hover:bg-amber-500/10 disabled:opacity-40"
          >
            {busy ? '…' : toast ?? 'Escalate'}
          </button>
        ) : (
          toast && <span className="shrink-0 font-mono text-[10px] text-emerald-300">{toast}</span>
        )}
      </div>
    </article>
  );
}
