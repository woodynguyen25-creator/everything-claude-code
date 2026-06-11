'use client';

import { useMemo, useState } from 'react';
import { useLiveResource } from '@/lib/useLiveResource';
import type { CouncilDomain } from '@/lib/council-roster';
import { DEPARTMENTS, departmentForSession, councilDomain, type DepartmentKey } from '@/lib/operations-taxonomy';
import { accentClasses } from '@/components/council/accents';
import { CouncilAgentCard, type HealthStatus } from '@/components/council/CouncilAgentCard';
import { RealmMap } from '@/components/council/RealmMap';
import { ActivityRecent } from '@/components/ActivityRecent';
import CouncilLedgerPanel from '@/components/CouncilLedgerPanel';
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
  // Sessions + worker health ride the shared polling spine. Sessions at 5s (fast floor
  // telemetry), worker health at 60s. Each keeps its last-good payload through a transient
  // failure, and the spine pauses polling while the tab is hidden.
  const { data: sessionsData, loading: sessionsLoading } = useLiveResource<{ sessions?: Heartbeat[] }>(
    '/api/sessions',
    { intervalMs: 5_000 },
  );
  const sessions = useMemo<Heartbeat[]>(() => sessionsData?.sessions ?? [], [sessionsData]);
  const loaded = !sessionsLoading;

  const { data: doctorData } = useLiveResource<DoctorAgent[]>('/api/doctor/agents', { intervalMs: 60_000 });
  const healthMap = useMemo<Record<string, HealthStatus>>(() => {
    const map: Record<string, HealthStatus> = {};
    for (const d of doctorData ?? []) map[d.slug] = d.status;
    return map;
  }, [doctorData]);

  // local remount counter — bumped when a worker card reports fresh activity
  const [activityKey, setActivityKey] = useState(0);

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

  // LeBot's call factors BOTH live sessions and worker health. Priority: a downed session,
  // then an offline worker, then a blocked session. No fires → he calls a clean floor green.
  function leBotCall(): string {
    const downSession = sessions.find((s) => s.status === 'error');
    if (downSession) return VERDICTS.error(downSession.persona);

    const offline = tracked.filter((m) => healthMap[m.healthSlug as string] === 'offline');
    if (offline.length === 1) return `${offline[0].loreName}'s gone dark — that's a man down. Get the worker back up.`;
    if (offline.length > 1) return `${offline[0].loreName} and ${offline.length - 1} more workers are dark — get the bench healthy.`;

    const blockedSession = sessions.find((s) => s.status === 'blocked');
    if (blockedSession) return VERDICTS.blocked(blockedSession.persona);

    if (!loaded) return 'Reading the room…';
    if (sessions.length === 0) return "Quiet house — nobody's on the floor. Roster's on standby.";
    if (grinding > 0) return `${grinding} on the floor, ${online}/${tracked.length} workers up. No fires — stay green.`;
    return 'Everybody catching a breather — nothing broken, just quiet.';
  }
  const leCall = leBotCall();

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

      {/* council AI drawdown — what every paid seat actually did today */}
      <div className="mb-8">
        <CouncilLedgerPanel />
      </div>

      {/* department jump-pills */}
      <div className="mb-8 flex flex-wrap gap-2">
        {sections.map((d) => {
          const a = accentClasses(d.accent);
          const sess = byDept.get(d.key) ?? [];
          const deptWorkers = councilDomain(d.key)?.members ?? [];
          const workers = deptWorkers.length;
          const trouble =
            sess.some((s) => s.status === 'blocked' || s.status === 'error') ||
            deptWorkers.some((m) => m.healthSlug && healthMap[m.healthSlug] === 'offline');
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
