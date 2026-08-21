/**
 * Council spend accounting and a fail-closed monthly ceiling.
 *
 * WHY THIS EXISTS
 * The council had NO spend ceiling of any kind. Nothing stopped a loop, a retry
 * storm, or a --rounds 5 run on a 200k prompt from billing without limit. The
 * trigger was an audit on 2026-08-21: of a ~$15 xAI charge, only ~$1.50 could be
 * accounted for from any ledger on this machine. You cannot investigate spend you
 * never recorded.
 *
 * TWO MEASUREMENT FAILURES THIS FIXES
 * 1. The ledger stored `promptTokensEst = chars/4`. That is provably low — a
 *    ~6-token prompt billed 510 input tokens on grok-4.5 (measured 2026-08-20),
 *    because providers bill a system overhead the estimate cannot see. Real
 *    `usage` from the API response is used whenever the provider returns it, and
 *    rows are marked so estimated and measured spend are never silently mixed.
 * 2. Reasoning models bill invisible thinking tokens as output. Provider-reported
 *    usage includes them; a char count of the visible answer does not.
 *
 * FAIL-CLOSED, deliberately (same rule x_pulse learned the hard way): a ledger row
 * that cannot be PARSED counts AGAINST the cap rather than for it. A spend log
 * that cannot be read is a cap that cannot be enforced, and the failure mode of
 * guessing low is an unbounded bill.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * USD per MILLION tokens, verified against vendor docs 2026-08-20/21.
 *
 * `null` means the seat is SUBSCRIPTION-metered, not per-token: claude, codex and
 * every agy-backed seat run through a CLI on a flat monthly plan, so a council
 * convene costs nothing marginal. That is the whole economic argument for the
 * current LEAD tier and it must not be modelled as $0-because-unknown — these are
 * $0 because the seat genuinely does not bill per call.
 */
const PRICING = {
  // xAI publishes a hard cliff: above a 200k-token PROMPT the rate DOUBLES.
  // A long council prompt therefore silently costs 2x. Modelled explicitly.
  xai: { in: 2.0, out: 6.0, bigIn: 4.0, bigOut: 12.0, bigPromptTokens: 200_000 },
  deepseek: { in: 0.27, out: 1.1 },
  groq: { in: 0.59, out: 0.79 },
  cerebras: { in: 0.1, out: 0.1 },
  // Free tier: $0 in money, but NOT free in privacy — Google states free-tier data
  // IS used to improve their products, which is why this seat is benched.
  gemini: { in: 0, out: 0 },

  claude: null,
  codex: null,
  geminipro: null,
  agyflash: null,
  agyopus: null,
};

/**
 * A malformed cap MUST NOT disable the ceiling. Measured 2026-08-21 (council audit):
 * Number('abc') -> NaN, and `mtd.usd >= NaN` is false, so a typo'd env var made
 * gate() allow every metered seat while printing "$NaN MTD". A module advertising
 * fail-closed that fails open on a typo is worse than no cap, because it is trusted.
 */
function resolveCap(raw) {
  if (raw === undefined || raw === null || raw === '') return 10;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    process.stderr.write(`[budget] ⚠ COUNCIL_MONTHLY_CAP_USD="${raw}" is not a valid number — falling back to $10 rather than disabling the cap
`);
    return 10;
  }
  return n;
}

const DEFAULT_CAP_USD = resolveCap(process.env.COUNCIL_MONTHLY_CAP_USD);

/** Seats that bill per token. Everything else is subscription-metered or free. */
function isMetered(seatId) {
  const p = PRICING[seatId];
  return Boolean(p) && (p.in > 0 || p.out > 0);
}

/**
 * Cost of one call. Prefers provider-reported usage; falls back to the char
 * estimate ONLY so an un-instrumented provider still contributes something to the
 * running total — never so it can look free.
 *
 * @returns {{usd:number, inTok:number, outTok:number, estimated:boolean}|null}
 *   null for subscription-metered seats (genuinely no per-call charge).
 */
function costOf(seatId, { usage, promptChars = 0, outputChars = 0 } = {}) {
  const price = PRICING[seatId];
  if (!price) return null;

  const reported =
    usage &&
    (usage.prompt_tokens != null || usage.input_tokens != null) &&
    (usage.completion_tokens != null || usage.output_tokens != null);

  const inTok = reported
    ? Number(usage.prompt_tokens ?? usage.input_tokens)
    : Math.ceil(promptChars / 4);
  const outTok = reported
    ? Number(usage.completion_tokens ?? usage.output_tokens)
    : Math.ceil(outputChars / 4);

  const big = price.bigPromptTokens != null && inTok >= price.bigPromptTokens;
  const rateIn = big ? price.bigIn : price.in;
  const rateOut = big ? price.bigOut : price.out;

  return {
    usd: (inTok / 1e6) * rateIn + (outTok / 1e6) * rateOut,
    inTok,
    outTok,
    estimated: !reported,
  };
}

/**
 * Month-to-date spend from the ledger.
 *
 * Counts `usd` when a row carries one. Rows written before cost accounting
 * existed have no `usd`, so they are re-priced from whatever token figures they
 * do have — otherwise the whole pre-8/21 history reads as free and the cap starts
 * from a false zero.
 *
 * @returns {{usd:number, rows:number, unparseable:number, estimatedRows:number}}
 */
function monthToDate(ledgerPath, now = new Date()) {
  const prefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const out = { usd: 0, rows: 0, unparseable: 0, estimatedRows: 0 };
  let raw;
  try {
    raw = fs.readFileSync(ledgerPath, 'utf8');
  } catch (e) {
    // ENOENT is a genuine zero: no convene has happened yet.
    // ANY OTHER failure (locked, permission denied, is-a-directory) means spend is
    // UNKNOWN, and unknown must never read as free — that is the same fail-open
    // hole the per-line parser already closes. Flagged as unreadable so gate()
    // treats it as over-cap. Found by the council audit 2026-08-21.
    if (e && e.code === 'ENOENT') return out;
    out.unreadable = true;
    out.readError = e && e.code ? e.code : 'unknown';
    return out;
  }

  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    let row;
    try {
      row = JSON.parse(t);
    } catch {
      // Fail-closed: an unreadable row is NOT free. Surfaced so a corrupted
      // ledger shows up as a warning instead of silently deflating the total.
      out.unparseable += 1;
      continue;
    }
    if (!String(row.ts || '').startsWith(prefix)) continue;
    out.rows += 1;

    if (typeof row.usd === 'number') {
      out.usd += row.usd;
      if (row.usdEstimated) out.estimatedRows += 1;
      continue;
    }
    const c = costOf(row.provider, {
      usage: row.usage,
      promptChars: row.promptChars || 0,
      outputChars: row.outputChars || 0,
    });
    if (c) {
      out.usd += c.usd;
      out.estimatedRows += 1;
    }
  }
  return out;
}

/**
 * Gate a dispatch. Subscription-metered seats are ALWAYS allowed through: they
 * cannot contribute to an overrun, and blocking them would disable the free LEAD
 * tier precisely when the metered budget is exhausted — the opposite of useful.
 *
 * @returns {{allowed:string[], blocked:string[], mtd:object, cap:number, over:boolean}}
 */
function gate(seatIds, ledgerPath, { cap = DEFAULT_CAP_USD, force = false } = {}) {
  // Validate the CALLER's cap too, not just the env default — a NaN passed in here
  // makes every comparison false and silently disables the ceiling.
  cap = resolveCap(cap);
  const mtd = monthToDate(ledgerPath);
  // Unreadable ledger => spend unknown => treat as over. Fail closed.
  const over = mtd.unreadable === true || mtd.usd >= cap;
  if (force || !over) {
    return { allowed: [...seatIds], blocked: [], mtd, cap, over };
  }
  const allowed = seatIds.filter(s => !isMetered(s));
  return { allowed, blocked: seatIds.filter(isMetered), mtd, cap, over };
}

/** One-line human summary for the console. */
function line(mtd, cap) {
  const pct = cap > 0 ? Math.round((mtd.usd / cap) * 100) : 0;
  const bits = [`[budget] $${mtd.usd.toFixed(4)} / $${cap.toFixed(2)} MTD (${pct}%)`];
  if (mtd.estimatedRows) bits.push(`${mtd.estimatedRows} row(s) ESTIMATED, not provider-reported`);
  if (mtd.unparseable) bits.push(`⚠ ${mtd.unparseable} UNPARSEABLE row(s) — counted against the cap`);
  if (mtd.unreadable) bits.push(`⛔ LEDGER UNREADABLE (${mtd.readError}) — spend unknown, treating as OVER cap`);
  return bits.join(' · ');
}

module.exports = { PRICING, DEFAULT_CAP_USD, isMetered, costOf, monthToDate, gate, line };
