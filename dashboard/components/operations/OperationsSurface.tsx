'use client';

import { useEffect, useState } from 'react';
import type { CouncilDomain } from '@/lib/council-roster';
import { DEPARTMENTS, departmentForSession, councilDomain, type DepartmentKey } from '@/lib/operations-taxonomy';
import { accentClasses } from '@/components/council/accents';
import { CouncilAgentCard, type HealthStatus } from '@/components/council/CouncilAgentCard';
import { RealmMap } from '@/components/council/RealmMap';
import { ActivityRecent } from '@/components/ActivityRecent';
import { SessionCard } from './SessionCard';
import { type Heartbeat, VERDICTS, PRIORITY } from './sessionFormat';

type Props = {
  domains: CouncilDomain[];
  dreams: string[];
};

type DoctorAgent = { slug: string; status: HealthStatus };

// Operations — LeBot James' one pane of glass. Merges live SESSION telemetry
// (heartbeats) with the curated COUNCIL roster, organized by the department each
// belongs to. Sessions and workers sit side by side per department; the company
// pulse + CEO verdict ride on top.
export function OperationsSurface({ domains, dreams }: Props) {
  const [sessions, setSessions] = useState<Heartbeat[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [healthMap, setHealthMap] = useState<Record<string, HealthStatus>>({});
  const [activityKey, setActivityKey] = useState(0);

  // live sessions — poll every 5s, cancel in-flight so a slow request can't clobber newer state
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch('/api/sessions', { cache: 'no-store', signal: controller.signal });
        const data = (await res.json()) as { sessions?: Heartbeat[] };
        if (active) {
          setSessions(data.sessions ?? []);
          setLoaded(true);
        }
      } catch {
        if (active) setLoaded(true);
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(id);
    };
  }, []);

  // worker health — slower 60s cadence, with the same active/abort guard as the session poll
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch('/api/doctor/agents', { cache: 'no-store', signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as DoctorAgent[];
        if (!active) return;
        const map: Record<string, HealthStatus> = {};
        data.forEach((d) => {
          map[d.slug] = d.status;
        });
        setHealthMap(map);
      } catch {
        // keep last-known health
      }
    };
    load();
    const t = window.setInterval(load, 60_000);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(t);
    };
  }, []);

  // group sessions by canonical department
  const byDept = new Map<DepartmentKey, Heartbeat[]>();
  for (const s of sessions) {
    const key = departmentForSession(s.session, s.group);
    const list = byDept.get(key) ?? [];
    list.push(s);
    byDept.set(key, list);
  }

  const counts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  const grinding = (counts.active ?? 0) + (counts.working ?? 0);

  const tracked = domains.flatMap((d) => d.members).filter((m) => m.healthSlug);
  const online = tracked.filter((m) => healthMap[m.healthSlug as string] === 'ok').length;

  // LeBot only sounds the alarm on real trouble (down beats blocked). With no fires he calls it
  // green instead of nagging idle sessions — a CEO celebrates a clean floor.
  const trouble = sessions.find((s) => s.status === 'error') ?? sessions.find((s) => s.status === 'blocked');
  const leCall = trouble
    ? VERDICTS[trouble.status](trouble.persona)
    : !loaded
      ? 'Reading the room…'
      : sessions.length === 0
        ? "Quiet house — nobody's on the floor. Roster's on standby."
        : grinding > 0
          ? `${grinding} on the floor and no fires. Stay green.`
          : 'Everybody catching a breather — nothing broken, just quiet.';

  // render any department that has live sessions or workers (council domains always have workers)
  const sections = DEPARTMENTS.filter(
    (d) => (byDept.get(d.key)?.length ?? 0) > 0 || (councilDomain(d.key)?.members.length ?? 0) > 0,
  );

  return (
    <section className="px-10 pb-16 pt-8">
      {/* header */}
      <div className="mb-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-text-muted">♛ LEBOT JAMES · OVERSEER</div>
        <h1
          className="mt-1 font-display text-4xl text-rune-gold"
          style={{ textShadow: '0 0 22px oklch(var(--color-rune-gold) / 0.25)' }}
        >
          War Room
        </h1>
        <p className="mt-1 text-sm italic text-text-secondary">
          Every live session and every worker, by department — one pane of glass over the whole company.
        </p>
      </div>

      {/* company pulse */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border-subtle bg-bg-panel/60 px-4 py-2.5 font-mono text-sm">
        <span className="text-text-secondary">State of the company:</span>
        <span className="text-emerald-400">{grinding} grinding</span>
        <span className="text-text-muted">·</span>
        <span className="text-text-muted">{counts.idle ?? 0} idle</span>
        <span className="text-text-muted">·</span>
        <span className="text-amber-400">{counts.blocked ?? 0} blocked</span>
        <span className="text-text-muted">·</span>
        <span className="text-red-400">{counts.error ?? 0} down</span>
        <span className="ml-auto text-text-muted">
          agents {online}/{tracked.length} online{!loaded ? ' · syncing…' : ''}
        </span>
      </div>

      {/* CEO verdict */}
      <div className="mb-6 rounded-lg border border-rune-gold/20 bg-rune-gold/5 px-4 py-3">
        <span className="font-display text-rune-gold">♛ LeBot&apos;s call: </span>
        <span className="text-text-primary">{leCall}</span>
      </div>

      {/* department jump-pills */}
      <div className="mb-8 flex flex-wrap gap-2">
        {sections.map((d) => {
          const a = accentClasses(d.accent);
          const sess = byDept.get(d.key) ?? [];
          const workers = councilDomain(d.key)?.members.length ?? 0;
          const trouble = sess.some((s) => s.status === 'blocked' || s.status === 'error');
          return (
            <a
              key={d.key}
              href={`#domain-${d.key}`}
              className={`group flex items-center gap-2 rounded-full border border-border-subtle bg-bg-panel/60 px-3 py-1.5 text-[11px] transition-colors hover:border-current ${a.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${trouble ? 'bg-amber-400 animate-ember-pulse' : a.dot}`} />
              <span className="font-medium text-text-primary group-hover:text-current">{d.label}</span>
              <span className="font-mono text-text-muted">
                {sess.length}s · {workers}w
              </span>
            </a>
          );
        })}
      </div>

      {/* realm topology centerpiece */}
      <div className="mb-12">
        <RealmMap domains={domains} healthMap={healthMap} dreams={dreams} />
      </div>

      {/* department sections */}
      <div className="space-y-12">
        {sections.map((d) => {
          const a = accentClasses(d.accent);
          const sess = (byDept.get(d.key) ?? [])
            .slice()
            .sort((x, y) => (PRIORITY[y.status] ?? 0) - (PRIORITY[x.status] ?? 0));
          const workers = councilDomain(d.key)?.members ?? [];
          return (
            <div key={d.key} id={`domain-${d.key}`} className="scroll-mt-6">
              <div className="mb-4 flex items-baseline gap-4">
                <div className={`font-mono text-[11px] tracking-[0.3em] ${a.text}`}>{d.label}</div>
                <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
                <div className="font-mono text-[10px] text-text-muted">
                  {sess.length} live · {workers.length} workers
                </div>
              </div>

              {/* live sessions */}
              <div className="mb-5">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-text-muted">▸ Live Sessions</div>
                {sess.length ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {sess.map((s) => (
                      <SessionCard key={s.session} s={s} />
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[11px] text-text-muted/70">No live sessions reporting here.</p>
                )}
              </div>

              {/* workers */}
              {workers.length > 0 && (
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-text-muted">▸ Workers</div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {workers.map((m) => (
                      <CouncilAgentCard
                        key={m.id}
                        member={m}
                        health={m.healthSlug ? healthMap[m.healthSlug] ?? null : null}
                        onActivity={() => setActivityKey((k) => k + 1)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* live activity */}
      <div className="mt-14">
        <div className="mb-3 flex items-baseline gap-4">
          <div className="font-mono text-[11px] tracking-[0.3em] text-text-muted">LIVE ACTIVITY</div>
          <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>
        <ActivityRecent key={activityKey} limit={10} />
      </div>
    </section>
  );
}
