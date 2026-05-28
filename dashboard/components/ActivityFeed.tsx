'use client';

import { useEffect, useState } from 'react';

interface Event {
  ts: number;
  agent: string;
  kind: string;
  message: string;
  detail?: string;
}

const AGENT_COLOR: Record<string, string> = {
  atlas: 'border-stone-300/40 text-stone-200',
  thor: 'border-sky-400/40 text-sky-200',
  sauron: 'border-orange-400/40 text-orange-200',
  fenrir: 'border-violet-400/40 text-violet-200',
  parlay: 'border-emerald-400/40 text-emerald-200',
  default: 'border-white/15 text-white/70',
};

const KIND_ICON: Record<string, string> = {
  transition: '◐',
  recover: '↻',
  entry: '▲',
  exit: '▼',
  reflection: '◇',
  report: '✎',
  job: '·',
  note: '·',
};

function fmtTime(ts: number): string {
  const date = new Date(ts * 1000);
  const diffMin = (Date.now() / 1000 - ts) / 60;
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}h ago`;
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function EventRow({ e }: { e: Event }) {
  const color = AGENT_COLOR[e.agent] || AGENT_COLOR.default;
  const icon = KIND_ICON[e.kind] || '·';
  return (
    <li className={`flex items-start gap-3 border-l-2 px-4 py-2.5 ${color.split(' ')[0]}`}>
      <span className="mt-0.5 inline-block text-base text-white/55">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`text-[10px] uppercase tracking-[0.18em] ${color.split(' ')[1]}`}>{e.agent}</span>
          <span className="text-[10px] text-white/35">{e.kind}</span>
          <span className="ml-auto text-[10px] text-white/35">{fmtTime(e.ts)}</span>
        </div>
        <div className="mt-0.5 truncate text-sm text-white/85">{e.message}</div>
        {e.detail && <div className="mt-0.5 truncate text-[11px] text-white/50">{e.detail}</div>}
      </div>
    </li>
  );
}

export function ActivityFeed() {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/activity/agents', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) setEvents(data.events);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'fetch failed');
      }
    }
    load();
    const id = setInterval(load, 20_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (err) {
    return <div className="mx-12 mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">Activity feed unreachable: {err}</div>;
  }
  if (!events) {
    return <div className="mx-12 mb-8 h-72 animate-pulse rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent" />;
  }
  if (events.length === 0) {
    return (
      <div className="mx-12 mb-8 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent p-5">
        <div className="text-sm text-white/55">No events yet. Agents are warm and waiting.</div>
      </div>
    );
  }

  return (
    <div className="mx-12 mb-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
      <ul className="max-h-[420px] divide-y divide-white/[0.04] overflow-y-auto">
        {events.map((e, i) => <EventRow key={`${e.ts}-${i}`} e={e} />)}
      </ul>
    </div>
  );
}
