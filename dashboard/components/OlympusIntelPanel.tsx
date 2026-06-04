'use client';

import { useLiveResource } from '@/lib/useLiveResource';
import { DataFooter, type DataState } from '@/components/ui/DataFooter';
import type { OlympusIntelPayload, WhaleAsset, Decision, ActivityRow } from '@/app/api/olympus-intel/route';

const POLL_MS = 120_000; // 2 min — not latency-critical

// ─── Signal styling ────────────────────────────────────────────────────────────

const SIGNAL_STYLES: Record<string, string> = {
  OI_SURGE_LONG:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  OI_SURGE_SHORT: 'bg-rose-500/15    text-rose-400    border-rose-500/30',
  OI_FLUSH:       'bg-amber-500/15   text-amber-400   border-amber-500/30',
  QUIET:          'bg-bg-deep        text-text-muted  border-border-subtle',
};

const SEVERITY_DOT: Record<string, string> = {
  extreme:  'bg-rose-400 animate-pulse',
  high:     'bg-amber-400',
  moderate: 'bg-sky-400',
  low:      'bg-text-muted',
};

const STANCE_COLORS: Record<string, string> = {
  PASS:    'text-emerald-400',
  SKIP:    'text-rose-400',
  HOLD:    'text-amber-400',
  STRONG_PASS: 'text-emerald-300',
  STRONG_SKIP: 'text-rose-300',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function WhaleRow({ asset, ctx }: { asset: string; ctx: WhaleAsset }) {
  const style = SIGNAL_STYLES[ctx.signal] ?? SIGNAL_STYLES.QUIET;
  const dot = SEVERITY_DOT[ctx.severity] ?? SEVERITY_DOT.low;

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border-subtle bg-bg-deep p-2.5">
      <div className="flex min-w-[2.5rem] flex-col items-center gap-1 pt-0.5">
        <span className="font-mono text-[11px] font-medium text-text-secondary">{asset}</span>
        <div className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-wide ${style}`}>
            {ctx.signal}
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            {ctx.oi_change_pct >= 0 ? '+' : ''}{ctx.oi_change_pct.toFixed(1)}%&nbsp;4h
          </span>
          <span className="font-mono text-[10px] text-text-secondary">
            ${ctx.current_oi_usd_m.toFixed(0)}M OI
          </span>
          {ctx.poseidon_signal && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] text-amber-400">
              ⛔ {ctx.poseidon_signal}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-1 text-[10px] text-text-muted italic">{ctx.note}</p>
      </div>
    </div>
  );
}

function DecisionRow({ d }: { d: Decision }) {
  const stanceColor = STANCE_COLORS[d.stance] ?? 'text-text-secondary';
  const pct = Math.round((d.conviction ?? 0) * 100);
  const when = d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-deep px-2.5 py-1.5">
      <span className="min-w-[3.5rem] font-mono text-[11px] font-medium text-text-primary">{d.ticker ?? '?'}</span>
      <span className={`font-mono text-[10px] font-semibold ${stanceColor}`}>{d.stance}</span>
      <div className="flex-1">
        <div className="h-1 overflow-hidden rounded-full bg-bg-raised">
          <div
            className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="font-mono text-[10px] text-text-muted">{pct}%</span>
      <span className="font-mono text-[9px] text-text-muted">{when}</span>
    </div>
  );
}

function ActivityItem({ row }: { row: ActivityRow }) {
  const statusColor = row.status === 'ok' || row.status === 'success'
    ? 'text-emerald-400'
    : row.status === 'error' ? 'text-rose-400' : 'text-text-muted';
  const when = row.ts ? new Date(row.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="flex items-center gap-2 py-1 text-[10px]">
      <span className="min-w-[4rem] font-mono text-text-secondary">{row.agent_name}</span>
      <span className="font-mono text-text-muted">{row.action_type}</span>
      {row.ticker && <span className="font-mono text-rune-gold">{row.ticker}</span>}
      <span className={`ml-auto font-mono ${statusColor}`}>{row.status}</span>
      <span className="font-mono text-text-muted">{when}</span>
    </div>
  );
}

// ─── Panel ─────────────────────────────────────────────────────────────────────

export default function OlympusIntelPanel() {
  const { data, loading, error, lastUpdated } = useLiveResource<OlympusIntelPayload>('/api/olympus-intel', {
    intervalMs: POLL_MS,
  });
  const state: DataState = loading
    ? 'loading'
    : error
      ? 'error'
      : data?.droplet_status === 'online'
        ? 'live'
        : 'stale';
  const ageSec = lastUpdated ? Math.round((Date.now() - lastUpdated) / 1000) : null;
  const whaleEntries = data?.whale_oi ? Object.entries(data.whale_oi) : [];
  const decisions = data?.decisions ?? [];
  const activity = data?.activity ?? [];
  const offline = !data || data.droplet_status === 'offline';

  return (
    <section className="mx-12 mb-2 rounded-2xl border border-border-subtle border-l-2 border-l-rune-gold bg-bg-raised">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <div>
          <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">OLYMPUS INTEL</div>
          <div className="mt-0.5 text-[12px] text-text-secondary">
            {offline ? 'Droplet offline — deploy pending' : 'Live council intelligence'}
          </div>
        </div>
        <DataFooter source="Droplet:8085" state={state} ageSec={ageSec} />
      </div>

      {offline ? (
        <div className="flex items-center justify-center px-5 py-8 text-[12px] text-text-muted italic">
          No data — run `hermes deploy` after fixing SSH to activate this panel.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">

          {/* Column 1: Whale OI */}
          <div>
            <div className="mb-2 font-mono text-[10px] tracking-widest text-text-muted">🐋 WHALE / OI</div>
            <div className="space-y-2">
              {whaleEntries.length > 0 ? (
                whaleEntries.map(([asset, ctx]) => (
                  <WhaleRow key={asset} asset={asset} ctx={ctx} />
                ))
              ) : (
                <p className="text-[11px] text-text-muted italic">Accumulating OI history…</p>
              )}
            </div>
          </div>

          {/* Column 2: Recent Decisions */}
          <div>
            <div className="mb-2 font-mono text-[10px] tracking-widest text-text-muted">⚖️ COUNCIL DECISIONS</div>
            <div className="space-y-1.5">
              {decisions.length > 0 ? (
                decisions.map((d, i) => <DecisionRow key={`${d.ticker}-${i}`} d={d} />)
              ) : (
                <p className="text-[11px] text-text-muted italic">No decisions recorded yet.</p>
              )}
            </div>
          </div>

          {/* Column 3: Agent Activity */}
          <div>
            <div className="mb-2 font-mono text-[10px] tracking-widest text-text-muted">🤖 AGENT ACTIVITY</div>
            <div className="divide-y divide-border-subtle">
              {activity.length > 0 ? (
                activity.map((row) => <ActivityItem key={row.id} row={row} />)
              ) : (
                <p className="text-[11px] text-text-muted italic">No activity logged yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
