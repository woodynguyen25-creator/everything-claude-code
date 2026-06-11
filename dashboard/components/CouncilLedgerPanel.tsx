'use client';

import { useLiveResource } from '@/lib/useLiveResource';
import type { CouncilLedgerData, ProviderRollup, LedgerEntry } from '@/lib/council-ledger-data';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const PROVIDER_META: Record<string, { label: string; accent: string }> = {
  codex: { label: 'GPT-5.5', accent: 'text-emerald-300' },
  gemini: { label: 'Gemini', accent: 'text-sky-300' },
  deepseek: { label: 'DeepSeek', accent: 'text-violet-300' },
  cerebras: { label: 'Cerebras', accent: 'text-amber-300' },
  groq: { label: 'Groq', accent: 'text-rose-300' },
};

function meta(provider: string) {
  return PROVIDER_META[provider] ?? { label: provider, accent: 'text-text-secondary' };
}

function agoLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return '—';
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function ProviderRow({ row, maxCalls }: { row: ProviderRollup; maxCalls: number }) {
  const m = meta(row.provider);
  const barPct = maxCalls > 0 ? Math.max(6, Math.round((row.calls / maxCalls) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-20 shrink-0">
        <span className={`font-mono text-xs font-medium ${m.accent}`}>{m.label}</span>
        <span className="ml-1 align-middle text-[9px] uppercase tracking-wide text-text-muted">
          {row.paid ? 'paid' : 'free'}
        </span>
      </div>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-panel">
        <div
          className="h-full rounded-full bg-rune-gold/60"
          style={{ width: `${barPct}%` }}
        />
      </div>
      <div className="flex w-44 shrink-0 items-center justify-end gap-3 font-mono text-[11px] text-text-muted">
        <span title="calls today">{row.calls}×</span>
        <span title="fail rate" className={row.failRate > 0 ? 'text-amber-400' : 'text-text-muted'}>
          {100 - row.failRate}%
        </span>
        <span title="avg latency">{(row.avgMs / 1000).toFixed(1)}s</span>
        <span title="estimated spend today" className="w-12 text-right text-text-secondary">
          {row.paid ? `$${row.estUsd.toFixed(3)}` : '—'}
        </span>
      </div>
    </div>
  );
}

function RecentRow({ entry }: { entry: LedgerEntry }) {
  const m = meta(entry.provider);
  return (
    <div className="flex items-center gap-2 py-1 font-mono text-[11px]">
      <span className={`w-16 shrink-0 ${m.accent}`}>{m.label}</span>
      <span className="w-14 shrink-0 text-right text-text-muted">{(entry.ms / 1000).toFixed(1)}s</span>
      <span
        className={`w-10 shrink-0 text-center ${entry.ok ? 'text-emerald-400' : 'text-red-400'}`}
        title={entry.error}
      >
        {entry.ok ? 'ok' : 'fail'}
      </span>
      <span className="flex-1 truncate text-text-secondary">{entry.tag || '—'}</span>
      <span className="shrink-0 text-text-muted">{agoLabel(entry.ts)}</span>
    </div>
  );
}

export default function CouncilLedgerPanel() {
  const { data, error: networkError } = useLiveResource<ApiResponse<CouncilLedgerData>>(
    '/api/council-ledger',
    { intervalMs: 60_000 },
  );

  const ledger = data && data.success && data.data ? data.data : null;
  const error =
    networkError ??
    (data && !(data.success && data.data) ? (data.error ?? 'Failed to load council ledger') : null);

  return (
    <section className="rounded-xl border border-border-subtle bg-bg-panel/60 p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
            ⚖ COUNCIL LEDGER
          </span>
          <h3 className="font-display text-lg text-rune-gold">AI Drawdown · Today</h3>
        </div>
        {ledger && (
          <div className="text-right font-mono text-xs text-text-muted">
            <span className="text-text-secondary">{ledger.totalCallsToday}</span> calls ·{' '}
            <span className="text-text-secondary">${ledger.totalEstUsdToday.toFixed(3)}</span> est
          </div>
        )}
      </div>

      {error && (
        <p className="font-mono text-xs text-amber-400">⚠ {error}</p>
      )}

      {!error && !ledger && <p className="font-mono text-xs text-text-muted">Loading…</p>}

      {ledger && ledger.providers.length === 0 && !error && (
        <p className="font-mono text-xs text-text-muted">
          No council dispatches today. Run{' '}
          <code className="text-text-secondary">node scripts/council/council.js</code> to populate.
        </p>
      )}

      {ledger && ledger.providers.length > 0 && (
        <>
          <div className="mb-4">
            {ledger.providers.map((row) => (
              <ProviderRow
                key={row.provider}
                row={row}
                maxCalls={Math.max(...ledger.providers.map((p) => p.calls))}
              />
            ))}
          </div>

          {ledger.recent.length > 0 && (
            <div className="border-t border-border-subtle pt-3">
              <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-text-muted">
                Recent dispatches
              </div>
              <div className="max-h-48 overflow-y-auto">
                {ledger.recent.map((entry, i) => (
                  <RecentRow key={`${entry.ts}-${entry.provider}-${i}`} entry={entry} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
