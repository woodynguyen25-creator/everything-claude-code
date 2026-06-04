'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CouncilMember } from '@/lib/council-roster';
import { accentClasses } from './accents';

export type HealthStatus = 'ok' | 'fallback' | 'offline' | null;

type Props = {
  member: CouncilMember;
  health: HealthStatus;
  onActivity?: () => void;
};

function healthLabel(member: CouncilMember, health: HealthStatus, paused: boolean): { text: string; dot: string; pulse: boolean } {
  if (paused) return { text: 'paused', dot: 'bg-amber-400', pulse: false };
  if (member.kind === 'bot') return { text: 'autonomous', dot: 'bg-bifrost', pulse: true };
  if (member.kind === 'council') return { text: 'advisory', dot: 'bg-rune-gold', pulse: true };
  if (health === 'ok') return { text: 'online', dot: 'bg-emerald-400', pulse: true };
  if (health === 'fallback') return { text: 'fallback', dot: 'bg-amber-400', pulse: true };
  if (health === 'offline') return { text: 'offline', dot: 'bg-rose-500', pulse: false };
  return { text: 'checking…', dot: 'bg-white/30', pulse: false };
}

export function CouncilAgentCard({ member, health, onActivity }: Props) {
  const a = accentClasses(member.accent);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const hs = healthLabel(member, health, paused);

  const offline = health === 'offline' && member.kind === 'agent' && !paused;

  async function runAction(action: 'nudge' | 'pause' | 'resume') {
    setBusy(action);
    try {
      const res = await fetch('/api/council/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id, action }),
      });
      const data = await res.json();
      if (data.ok) {
        if (action === 'pause') setPaused(true);
        if (action === 'resume') setPaused(false);
        setToast(data.message ?? 'Done');
        onActivity?.();
        window.setTimeout(() => setToast(null), 2400);
      } else {
        setToast(data.error ?? 'Action failed');
        window.setTimeout(() => setToast(null), 2400);
      }
    } catch {
      setToast('Action failed');
      window.setTimeout(() => setToast(null), 2400);
    } finally {
      setBusy(null);
    }
  }

  const can = (x: string) => member.actions.includes(x as never);

  return (
    <article
      className={`group relative overflow-hidden rounded-xl border border-border-subtle border-l-2 ${a.borderL} bg-bg-raised p-4 transition-all duration-300 hover:bg-bg-hover ${
        offline ? 'opacity-70' : `hover:${a.glow}`
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-bg-deep text-xl ${
            hs.pulse && !offline ? a.text : 'text-text-muted'
          }`}
        >
          <span aria-hidden>{member.emoji}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`truncate font-display text-base leading-tight ${a.text}`}>{member.loreName}</h3>
          </div>
          <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary">{member.role}</div>
          <p className="mt-2 text-[12px] leading-5 text-text-muted">{member.blurb}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${hs.dot} ${hs.pulse ? 'animate-ember-pulse' : ''}`} />
            <span className="font-mono text-[10px] text-text-muted">{hs.text}</span>
          </span>
        </div>
      </div>

      {/* Action rail */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {can('chat') && member.href ? (
          <Link
            href={member.href}
            className={`rounded-md border border-border-subtle px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-current hover:${a.text}`}
          >
            Open chat →
          </Link>
        ) : null}
        {can('open') && member.href ? (
          <Link
            href={member.href}
            className={`rounded-md border border-border-subtle px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-current hover:${a.text}`}
          >
            View →
          </Link>
        ) : null}
        {can('nudge') ? (
          <button
            type="button"
            onClick={() => runAction('nudge')}
            disabled={busy !== null}
            className="rounded-md border border-border-subtle px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-rune-gold hover:text-rune-gold disabled:opacity-40"
          >
            {busy === 'nudge' ? 'Nudging…' : 'Nudge'}
          </button>
        ) : null}
        {can('pause') || can('nudge') ? (
          <button
            type="button"
            onClick={() => runAction(paused ? 'resume' : 'pause')}
            disabled={busy !== null}
            className="rounded-md border border-border-subtle px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-amber-400 hover:text-amber-300 disabled:opacity-40"
          >
            {busy === 'pause' || busy === 'resume' ? '…' : paused ? 'Resume' : 'Pause'}
          </button>
        ) : null}

        {toast ? (
          <span className="ml-auto font-mono text-[10px] text-emerald-300/90 animate-[home-fade-up_240ms_ease-out]">{toast}</span>
        ) : null}
      </div>
    </article>
  );
}
