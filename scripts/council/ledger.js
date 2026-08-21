/**
 * Council ledger — JSONL record of every model dispatch.
 * One line per provider call so the dashboard can show paid-capacity drawdown.
 */
'use strict';

const { costOf } = require('./budget');

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LEDGER = path.resolve(__dirname, '..', '..', 'dashboard', 'data', 'council-ledger.jsonl');

/**
 * Build one immutable ledger entry from a provider result. Token counts are chars/4 estimates.
 *
 * `kind` classifies the PHYSICAL call so consumers can filter:
 *   convene   — a real council question (round 1)
 *   debate    — round 2
 *   synth     — a synthesis attempt (including failed fallback links)
 *   preflight — the one-word PONG before a CLI convene
 *   probe     — a health.js liveness ping
 * ⚠ LATENCY STATS MUST FILTER OUT probe/preflight ROWS. A one-word PONG answers in
 * ~1-8s where a real prompt takes 24-480s; mixing them craters every percentile and
 * re-creates the sized-timeouts-off-the-health-probe mistake the xai seat already
 * documents. budget.js deliberately does NOT filter — money is money.
 */
function buildEntry(result, { tag = '', promptChars = 0, round = undefined, kind = undefined } = {}) {
  const outputChars = result.text ? result.text.length : 0;
  // Real spend, priced from provider-reported usage where the provider returns it.
  // Recorded per row so month-to-date spend is a SUM of measurements rather than a
  // reconstruction: a ~$15 xAI charge could only be explained to ~$1.50 on 8/21
  // precisely because no row carried a cost. null = subscription-metered seat.
  const cost = costOf(result.provider, { usage: result.usage, promptChars, outputChars });
  return {
    ts: new Date().toISOString(),
    provider: result.provider,
    model: result.model,
    ok: Boolean(result.ok),
    ms: result.ms ?? 0,
    promptChars,
    outputChars,
    promptTokensEst: Math.ceil(promptChars / 4),
    outputTokensEst: Math.ceil(outputChars / 4),
    // Provider-reported token counts when available — these are what actually bill.
    promptTokens: cost ? cost.inTok : undefined,
    outputTokens: cost ? cost.outTok : undefined,
    usd: cost ? cost.usd : undefined,
    // True when priced off chars/4 rather than provider usage. Never mix the two
    // silently: one is a measurement, the other is a guess that reads LOW.
    usdEstimated: cost && cost.estimated ? true : undefined,
    round,
    kind,
    retried: result.retried || undefined,
    // Machine-readable stance when the seat emitted a VERDICT line (--decide
    // mode, or organically). Accrues the data that makes the council's dissent
    // rate auditable — without it, "the council agreed" is unfalsifiable.
    verdict: result.verdict || undefined,
    tag,
    error: result.error || undefined,
  };
}

function appendEntries(entries, ledgerPath = DEFAULT_LEDGER) {
  if (!entries || entries.length === 0) return;
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const lines = entries.map(e => JSON.stringify(e)).join('\n');
  fs.appendFileSync(ledgerPath, `${lines}\n`, 'utf8');
}

/**
 * Append ONE row, immediately.
 *
 * ADDED 2026-08-21. The council used to accumulate rows in memory and flush the
 * batch once, at the end of main(). But a dispatch BILLS the instant it returns,
 * so anything that killed the run first — a thrown seat, Ctrl-C, `process.exit`,
 * a crash in the debate round — spent real money and recorded nothing.
 *
 * That is worse than lossy accounting, because budget.js derives month-to-date
 * spend by SUMMING these rows. A crashed run makes MTD read LOW, so the cap fires
 * LATE — and the runs most likely to crash (retry storms, long --rounds runs) are
 * exactly the runaway the cap exists to catch. The ceiling was blindest in the one
 * case it was built for.
 *
 * Writing per-dispatch costs one small appendFileSync per seat — single-line
 * O_APPEND writes, a handful per run. Cheap insurance against un-auditable spend.
 *
 * CONCURRENCY: MEASURED, not assumed. 8 processes x 200 rows appended
 * simultaneously to one file on Windows => 1600/1600 rows on disk, 0 torn, every
 * process complete. Rows are small because they store METADATA only (answer text
 * goes to saveTranscript): the real ledger's median row is 210 bytes, p99 is 284,
 * max is 556 — orders of magnitude below where a single append could tear.
 * If that ever changes, the downstream guard now genuinely holds: budget.js BLOCKS
 * metered dispatch when any row is unparseable. That was a false claim in this very
 * comment until 2026-08-21 — gate() incremented a counter and allowed the run.
 */
function appendEntry(entry, ledgerPath = DEFAULT_LEDGER) {
  appendEntries([entry], ledgerPath);
}

const TRANSCRIPT_DIR = path.resolve(__dirname, '..', '..', 'dashboard', 'data', 'council-transcripts');

/**
 * Persist the full text of a council run.
 *
 * ADDED 2026-08-03. The ledger deliberately stores metadata only, so the dashboard's
 * cost view stays small — but that meant every council VERDICT evaporated the moment the
 * terminal scrolled. Runs were being re-dispatched to recover answers that had already been
 * paid for, and a seat could not be audited for fabrication after the fact. Text goes in a
 * sibling file, not in the JSONL, so the cost view is unaffected.
 *
 * Returns the transcript path (or null if nothing was written).
 */
function saveTranscript(results, { tag = '', question = '' } = {}) {
  const withText = (results || []).filter(r => r && r.text);
  if (withText.length === 0) return null;
  fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = (tag || 'untagged').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60);
  const file = path.join(TRANSCRIPT_DIR, `${stamp}__${slug}.md`);
  const parts = [
    `# Council run — ${tag || 'untagged'}`,
    `_${new Date().toISOString()}_`,
    '',
    '## Question',
    '',
    '```',
    question.slice(0, 20000),
    '```',
    '',
  ];
  for (const r of withText) {
    parts.push(`## ${r.provider} (${r.model}${r.ms ? `, ${(r.ms / 1000).toFixed(1)}s` : ''})`,
      '', r.text, '');
  }
  fs.writeFileSync(file, parts.join('\n'), 'utf8');
  return file;
}

function readRecent(n = 20, ledgerPath = DEFAULT_LEDGER) {
  try {
    const lines = fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/).filter(Boolean);
    return lines.slice(-n).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

/** Per-provider call counts and success rate for entries on a given UTC day (default: today). */
function summarize(entries, dayIso = new Date().toISOString().slice(0, 10)) {
  const byProvider = {};
  for (const e of entries) {
    if (!e.ts || !e.ts.startsWith(dayIso)) continue;
    const cur = byProvider[e.provider] || { calls: 0, ok: 0, ms: 0, outputChars: 0 };
    byProvider[e.provider] = {
      calls: cur.calls + 1,
      ok: cur.ok + (e.ok ? 1 : 0),
      ms: cur.ms + (e.ms || 0),
      outputChars: cur.outputChars + (e.outputChars || 0),
    };
  }
  return byProvider;
}

module.exports = { DEFAULT_LEDGER, TRANSCRIPT_DIR, buildEntry, appendEntry, appendEntries, saveTranscript, readRecent, summarize };
