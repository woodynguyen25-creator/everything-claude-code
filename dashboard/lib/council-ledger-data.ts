import fs from 'node:fs';
import path from 'node:path';

/**
 * Council ledger reader — parses dashboard/data/council-ledger.jsonl (written by
 * scripts/council/council.js) into a dashboard-friendly summary: per-provider
 * drawdown for today + the most recent dispatches. This is the "what did my whole
 * AI council actually do" view that complements the DeepSeek-only TriadCostMeter.
 */

export type LedgerEntry = {
  ts: string;
  provider: string;
  model: string;
  ok: boolean;
  ms: number;
  promptChars: number;
  outputChars: number;
  tag?: string;
  error?: string;
};

export type ProviderRollup = {
  provider: string;
  calls: number;
  ok: number;
  failRate: number;
  totalMs: number;
  avgMs: number;
  outputChars: number;
  estUsd: number;
  paid: boolean;
};

export type CouncilLedgerData = {
  generatedAt: string;
  day: string;
  totalCallsToday: number;
  totalEstUsdToday: number;
  providers: ProviderRollup[];
  recent: LedgerEntry[];
};

const LEDGER_PATH = path.join(process.cwd(), 'data', 'council-ledger.jsonl');
const CACHE_TTL_MS = 30_000;

/**
 * REWRITTEN 2026-08-21 (claude-seat review): this file carried a FOURTH private
 * copy of pricing that contradicted budget.js in DIRECTION — it showed codex
 * ($12/Mtok, "paid") as the expensive seat and groq ($0, "free") as free, while
 * the source of truth prices codex at $0 marginal (subscription) and groq as
 * METERED. The cost view rendered free seats expensive and billed seats free.
 * Rows now carry real `usd` (provider-reported where available), so this file
 * SUMS instead of re-pricing. Rows without usd predate cost accounting and
 * count 0 here — the authoritative month-to-date lives in budget.js, and the
 * dashboard shows recorded spend, never a second opinion of it.
 * Metered set mirrors budget.js PRICING (a seat is "paid" if per-token).
 */
const METERED = new Set(['xai', 'deepseek', 'groq', 'cerebras']);

/**
 * One-word pings (health probes, preflights) MUST NOT enter latency/failure
 * stats — codex measured today's xai average at 56.5s with preflights mixed in
 * vs 65.5s real. Negative filter: rows that predate `kind` are real work.
 * Mirrors scripts/council/ledger.js isTimingRow.
 */
const NON_TIMING_KINDS = new Set(['probe', 'preflight']);
const isTimingRow = (e: LedgerEntry) => !NON_TIMING_KINDS.has((e as { kind?: string }).kind ?? '');

let cache: { at: number; value: CouncilLedgerData } | null = null;

function readEntries(): LedgerEntry[] {
  const raw = fs.readFileSync(LEDGER_PATH, 'utf8');
  const out: LedgerEntry[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as LedgerEntry);
    } catch {
      // skip a malformed line rather than failing the whole read
    }
  }
  return out;
}

function build(): CouncilLedgerData {
  const day = new Date().toISOString().slice(0, 10);
  const entries = readEntries();
  const today = entries.filter((e) => typeof e.ts === 'string' && e.ts.startsWith(day));

  const byProvider = new Map<string, ProviderRollup>();
  for (const e of today) {
    if (!isTimingRow(e)) continue; // probes/preflights poison every stat below
    const cur =
      byProvider.get(e.provider) ??
      {
        provider: e.provider,
        calls: 0,
        ok: 0,
        failRate: 0,
        totalMs: 0,
        avgMs: 0,
        outputChars: 0,
        estUsd: 0,
        paid: METERED.has(e.provider),
      };
    cur.calls += 1;
    cur.ok += e.ok ? 1 : 0;
    cur.totalMs += e.ms || 0;
    cur.outputChars += e.outputChars || 0;
    cur.estUsd += Number((e as { usd?: number }).usd) || 0; // recorded spend, not a re-estimate
    byProvider.set(e.provider, cur);
  }

  const providers = [...byProvider.values()]
    .map((p) => ({
      ...p,
      avgMs: p.calls ? Math.round(p.totalMs / p.calls) : 0,
      failRate: p.calls ? Math.round(((p.calls - p.ok) / p.calls) * 100) : 0,
      estUsd: Number(p.estUsd.toFixed(4)),
    }))
    .sort((a, b) => b.calls - a.calls);

  const recent = entries.filter(isTimingRow).slice(-12).reverse();

  return {
    generatedAt: new Date().toISOString(),
    day,
    totalCallsToday: today.length,
    totalEstUsdToday: Number(providers.reduce((s, p) => s + p.estUsd, 0).toFixed(4)),
    providers,
    recent,
  };
}

export function readCouncilLedger(): CouncilLedgerData {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  try {
    const value = build();
    cache = { at: Date.now(), value };
    return value;
  } catch {
    const empty: CouncilLedgerData = {
      generatedAt: new Date().toISOString(),
      day: new Date().toISOString().slice(0, 10),
      totalCallsToday: 0,
      totalEstUsdToday: 0,
      providers: [],
      recent: [],
    };
    cache = { at: Date.now(), value: empty };
    return empty;
  }
}
