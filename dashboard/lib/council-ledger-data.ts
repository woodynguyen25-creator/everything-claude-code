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
const CHARS_PER_TOKEN = 4; // rough heuristic; ledger logs chars, not tokens

// Blended $/1M-token estimates (input+output averaged) so the meter reflects
// real drawdown ordering, not exact billing. Codex/Gemini/DeepSeek are paid
// seats; cerebras/groq are free tiers (estUsd ~ 0).
const PRICING: Record<string, { perMTokens: number; paid: boolean }> = {
  codex: { perMTokens: 12, paid: true }, // GPT-5.5 via ChatGPT/Codex subscription
  gemini: { perMTokens: 1.5, paid: true },
  deepseek: { perMTokens: 0.5, paid: true },
  cerebras: { perMTokens: 0, paid: false },
  groq: { perMTokens: 0, paid: false },
};

let cache: { at: number; value: CouncilLedgerData } | null = null;

function estUsd(provider: string, promptChars: number, outputChars: number): number {
  const p = PRICING[provider];
  if (!p || p.perMTokens === 0) return 0;
  const tokens = (promptChars + outputChars) / CHARS_PER_TOKEN;
  return (tokens / 1_000_000) * p.perMTokens;
}

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
        paid: PRICING[e.provider]?.paid ?? false,
      };
    cur.calls += 1;
    cur.ok += e.ok ? 1 : 0;
    cur.totalMs += e.ms || 0;
    cur.outputChars += e.outputChars || 0;
    cur.estUsd += estUsd(e.provider, e.promptChars || 0, e.outputChars || 0);
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

  const recent = entries.slice(-12).reverse();

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
