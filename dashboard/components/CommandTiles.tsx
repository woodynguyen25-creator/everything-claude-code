'use client';

import Link from 'next/link';
import { useLiveResource } from '@/lib/useLiveResource';
import { DataFooter, type DataState } from '@/components/ui/DataFooter';

type Health = { slug: string; status: 'ok' | 'fallback' | 'offline' };
type Task = { id: number; title: string; status: string; priority: number };
type Habits = Record<string, boolean>;
type Olympus = {
  current_equity?: number;
  starting_equity?: number;
  open_positions_count?: number;
  equity_source?: 'live' | 'sample';
};

type Fetched<T> = { data: T | null; at: number | null; state: DataState };

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

const HABIT_LABELS: Record<string, string> = {
  workout: 'Workout',
  read: 'Read',
  podcast: 'Podcast',
  apply: 'Apply',
};

export default function CommandTiles() {
  // Four independent endpoints, each on the shared spine (dedupes with any other poller of the same URL).
  const olympusR = useLiveResource<Olympus>('/api/olympus/state', { intervalMs: 60_000 });
  const healthR = useLiveResource<Health[]>('/api/doctor/agents', { intervalMs: 60_000 });
  const habitsR = useLiveResource<Habits>('/api/habits', { intervalMs: 60_000 });
  const tasksR = useLiveResource<Task[]>('/api/tasks', { intervalMs: 60_000 });

  // Adapt the hook snapshot to the existing { data, at, state } shape so the JSX below is untouched.
  const adapt = <T,>(r: {
    data: T | null;
    loading: boolean;
    error: string | null;
    lastUpdated: number;
  }): Fetched<T> => ({
    data: r.data,
    at: r.lastUpdated || null,
    state: r.loading ? 'loading' : r.error ? 'error' : 'live',
  });
  const olympus = adapt(olympusR);
  const health = adapt(healthR);
  const habits = adapt(habitsR);
  const tasks = adapt(tasksR);

  const age = (at: number | null) => (at ? Math.round((Date.now() - at) / 1000) : null);

  // Olympus
  const eq = olympus.data?.current_equity ?? null;
  const start = olympus.data?.starting_equity ?? null;
  const pnl = eq != null && start != null ? eq - start : null;
  const positions = olympus.data?.open_positions_count ?? null;
  // When the Droplet shows no live PnL movement the figures are the mock
  // fallback — badge them honestly instead of rendering as real equity.
  const olympusSample = olympus.data?.equity_source === 'sample';

  // Health
  const agents = health.data ?? [];
  const okCount = agents.filter((a) => a.status === 'ok').length;
  const offline = agents.filter((a) => a.status === 'offline').length;

  // Habits
  const habitEntries = habits.data ? Object.entries(habits.data) : [];
  const doneCount = habitEntries.filter(([, v]) => v).length;

  // Tasks
  const pending = (tasks.data ?? []).filter((t) => t.status === 'pending');
  const nextTask = pending[0] ?? null;

  return (
    <section className="mx-12 mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* Olympus Fund */}
      <Link
        href="/olympus"
        className="group flex flex-col rounded-xl border border-border-subtle border-l-2 border-l-rune-gold bg-bg-raised p-5 shadow-[inset_0_1px_0_0_oklch(100%_0_0_/_0.06)] transition-all duration-150 hover:border-rune-gold/40 hover:bg-bg-hover"
      >
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">OLYMPUS FUND</div>
        <div className="mt-2 font-numeric text-5xl tabular-nums tracking-tight text-rune-gold">{eq != null ? money(eq) : '—'}</div>
        <div className="mt-1 flex items-center gap-2 text-[12px]">
          {olympusSample ? (
            <span className="text-text-muted">demo figures — awaiting live fund</span>
          ) : pnl != null ? (
            <span className={pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {pnl >= 0 ? '▲' : '▼'} {money(Math.abs(pnl))} vs start
            </span>
          ) : (
            <span className="text-text-muted">paper fund</span>
          )}
        </div>
        <div className="mt-auto pt-3">
          <DataFooter
            source="Droplet"
            state={olympusSample ? 'sample' : olympus.state}
            ageSec={age(olympus.at)}
          />
          {positions != null && !olympusSample ? (
            <div className="mt-1 font-mono text-[10px] text-text-muted">{positions} open positions</div>
          ) : null}
        </div>
      </Link>

      {/* Agent Health */}
      <Link
        href="/war-room"
        className="group flex flex-col rounded-xl border border-border-subtle bg-bg-raised p-5 shadow-[inset_0_1px_0_0_oklch(100%_0_0_/_0.06)] transition-all duration-150 hover:border-rune-gold/40 hover:bg-bg-hover"
      >
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">AGENT HEALTH</div>
        <div className="mt-2 font-numeric text-2xl tabular-nums text-text-primary">
          {agents.length ? `${okCount}/${agents.length}` : '—'}
        </div>
        <div className="mt-1 text-[12px]">
          {offline > 0 ? (
            <span className="text-rose-400">{offline} offline · needs attention</span>
          ) : (
            <span className="text-emerald-400">all council online</span>
          )}
        </div>
        <div className="mt-auto pt-3">
          <DataFooter source="doctor" state={health.state} ageSec={age(health.at)} />
        </div>
      </Link>

      {/* My Life */}
      <Link
        href="#today"
        className="group flex flex-col rounded-xl border border-border-subtle bg-bg-raised p-5 shadow-[inset_0_1px_0_0_oklch(100%_0_0_/_0.06)] transition-all duration-150 hover:border-rune-gold/40 hover:bg-bg-hover"
      >
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">MY LIFE</div>
        <div className="mt-2 font-numeric text-2xl tabular-nums text-text-primary">
          {habitEntries.length ? `${doneCount}/${habitEntries.length}` : '—'}
          <span className="ml-1 font-body text-sm text-text-muted">rites</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {habitEntries.map(([k, v]) => (
            <span
              key={k}
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                v ? 'bg-emerald/15 text-emerald' : 'bg-bg-deep text-text-muted'
              }`}
            >
              {HABIT_LABELS[k] ?? k}
            </span>
          ))}
        </div>
        <div className="mt-auto pt-3">
          <DataFooter source="habits.db" state={habits.state} ageSec={age(habits.at)} />
        </div>
      </Link>

      {/* Today's Brief / Next action */}
      <Link
        href="#today"
        className="group flex flex-col rounded-xl border border-border-subtle bg-bg-raised p-5 shadow-[inset_0_1px_0_0_oklch(100%_0_0_/_0.06)] transition-all duration-150 hover:border-rune-gold/40 hover:bg-bg-hover"
      >
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">NEXT ACTION</div>
        {nextTask ? (
          <>
            <div className="mt-2 line-clamp-2 text-[15px] font-medium leading-snug text-text-primary">{nextTask.title}</div>
            <div className="mt-1 text-[12px] text-text-muted">
              {pending.length} task{pending.length === 1 ? '' : 's'} pending
            </div>
          </>
        ) : (
          <div className="mt-2 text-[15px] text-text-secondary">Nothing queued — quiet realm.</div>
        )}
        <div className="mt-auto pt-3">
          <DataFooter source="tasks.db" state={tasks.state} ageSec={age(tasks.at)} />
        </div>
      </Link>
    </section>
  );
}
