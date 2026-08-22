/**
 * The dispatch boundary — every PHYSICAL provider attempt goes through here,
 * and every one of them gets a ledger row.
 *
 * WHY THIS EXISTS
 * The 2026-08-21 council review (codex seat, VERDICT: NO-GO) proved the ledger
 * was structurally incomplete even after per-dispatch writes landed:
 *
 *   - callSeat() overwrote `result` on retry and returned only the second
 *     attempt, so 64 rows marked `retried` corresponded to 64 BILLED first
 *     attempts with no row at all.
 *   - The API preflight PONGs ran before the budget gate and were never
 *     logged — metered spend outside the ceiling, invisible to it.
 *   - Failed synthesis-fallback attempts inside synthesize()'s loop billed
 *     and vanished; only the final result was recorded.
 *
 * Its summary stands as the module's contract: budget enforcement, reliability
 * statistics, retry analysis and verdict calibration all assume a complete
 * ledger — analytics on top of knowingly incomplete telemetry are
 * "precise-looking fiction". So: ONE function performs every physical call and
 * appends its row before returning. Callers do not touch SEATS directly.
 *
 * The ledger write itself is best-effort here: a full disk must not kill a run
 * that already paid for its answers. budget.js closes the resulting gap from
 * the other side — an unreadable ledger or unparseable row fails CLOSED there.
 */
'use strict';

const { SEATS } = require('./providers');
const { buildEntry, appendEntry, DEFAULT_LEDGER } = require('./ledger');
const budget = require('./budget');
const { SEAT_BY_ID } = require('./roster');

/**
 * DATA-TERMS GATE — the privacy analogue of the budget gate, and on the same
 * boundary for the same reason: a rule enforced by seat-tier placement is one
 * `--to` flag away from false.
 *
 * WHY (2026-08-21): the free-tier Gemini API and every Antigravity/agy path
 * carry `dataTerms: 'TRAINS-ON-INPUT'` — Google's terms say Interactions train
 * their models AND "employees and contractors may access, view, review and use"
 * them. The advertised opt-out was investigated the same day and is WEAK: the
 * only discoverable toggle is the IDE's Settings→Account→"Enable Telemetry"
 * switch, Google has left forum threads asking "does it stop training?"
 * unanswered for months, and the `agy` CLI — the path the council actually
 * uses — exposes no privacy flag at all. Under verify-per-PATH, an unconfirmed
 * toggle in a DIFFERENT client is not evidence about this one.
 *
 * So the rule became routing, not trust: an unmarked prompt is presumed
 * SENSITIVE (fail closed, like budget), and TRAINS-ON-INPUT seats refuse it
 * before any network call. `--public` (meta.publicContent) unlocks them for
 * work with nothing to protect — public-repo code, generic research — which is
 * how the free Gemini 3.1 Pro / Opus 4.6 / Flash capacity stays usable at $0
 * without ever seeing a trading position or client name.
 *
 * UNVERIFIED seats (deepseek/groq/cerebras) deliberately pass: refusing them
 * would gut the default worker tier on suspicion, and health.js already prints
 * the warning every run. 'UNVERIFIED is not safe' is a reason to go verify,
 * not to break the roster silently.
 *
 * @returns {object|null} a refusal result, or null when the dispatch may proceed
 */
function dataTermsRefusal(seat, meta = {}) {
  const def = SEAT_BY_ID[seat];
  if (!def || def.dataTerms !== 'TRAINS-ON-INPUT' || meta.publicContent) return null;
  return {
    provider: seat,
    model: 'blocked',
    ok: false,
    text: '',
    ms: 0,
    error: `data-terms: ${seat} TRAINS ON INPUT (and allows human review) — prompt presumed sensitive. Pass --public only if this content could be posted publicly as-is.`,
  };
}

/**
 * Pull a machine-readable verdict off an answer.
 *
 * strict=false (organic capture): last VERDICT anywhere in the text wins, so a
 * seat that quotes another seat's verdict is not misread.
 *
 * strict=true (--decide): the verdict must sit in the LAST 3 non-empty lines.
 * Added 2026-08-21 after the codex review: the loose matcher accepted a VERDICT
 * line buried mid-answer, which let a seat "decide" in paragraph two and hedge
 * for ten more — with MODIFY already 69% of all verdicts, a verdict that does
 * not commit the CONCLUSION of the answer reopens the "it depends" hatch
 * decision mode exists to close. A decide-mode answer whose verdict is not at
 * the end parses as NO VERDICT, and council.js already surfaces those seats
 * with "read their answers, do not assume assent".
 */
function extractVerdict(text, { strict = false, binary = false } = {}) {
  const src = String(text || '');
  // Strict scope is the last 5 non-empty lines (was 3): a legitimate verdict
  // followed by a short source/footer block was being dropped (codex probe,
  // 2026-08-21). Still the TAIL of the answer - the point stands that a verdict
  // must commit the conclusion, not paragraph two.
  const scope = strict
    ? src.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(-5).join('\n')
    : src;
  // \b anchor: without it 'VERDICT: GOOD' parsed as GO (found by the codex
  // seat probing this very function). NO-?GO before GO so the alternation cannot
  // shortcut, and the boundary kills GOOD/GONE/MODIFYING style false hits.
  const matches = scope.match(/VERDICT:\s*(NO-?GO|GO|MODIFY)\b/gi);
  if (!matches) return null;
  const v = matches[matches.length - 1].replace(/VERDICT:\s*/i, '').toUpperCase().replace('NOGO', 'NO-GO');
  // --binary is an ENFORCED contract, not prompt decoration (codex: 'my probe
  // returned MODIFY under strict extraction'). A MODIFY in binary mode parses as
  // NO VERDICT, so the seat lands in the 'read their answers, do not assume
  // assent' bucket instead of silently rejoining the ternary cohort.
  if (binary && v === 'MODIFY') return null;
  return v;
}

/**
 * Degenerate-output detector: a repetition loop is NOT an answer.
 *
 * Live failure 2026-08-21: grok-4.6 returned 21,876 chars of one sentence
 * repeated 151 times — no content, no verdict — and the system counted it a
 * valid seat answer because `ok` only checked that text was non-empty. Billed
 * ~5k output tokens for nothing, held a quorum seat, and in --decide would
 * have been reported as "no verdict line parsed" rather than as a failure.
 *
 * Detection is SENTENCE uniqueness: split on sentence boundaries and measure the
 * distinct share. The live blob is two sentences alternating ~300 times (ratio
 * ≈ 0.007); varied long-form prose is nearly all unique (ratio ≈ 1.0). A first
 * draft used fixed-width shingles at a prime stride, reasoning that a prime
 * "avoids phase-lock" — exactly backwards: a prime stride walks every residue of
 * the loop's period and MAXIMIZES distinct windows (measured 0.35 on the live
 * blob, above any sane threshold). The unit of repetition is the sentence, so
 * the detector measures sentences. Tested against the real blob, not just
 * synthetic fixtures.
 *
 * Conservative on purpose: only text over 2000 chars with 20+ sentences is
 * checked, and the ratio must fall below 30%. A false "degenerate" drops a real
 * answer, which is worse than letting a marginal one through — the human reads
 * the text either way.
 */
const DEGENERATE_MIN_CHARS = 2000;
const DEGENERATE_MIN_SENTENCES = 20;
const DEGENERATE_MAX_UNIQUE_RATIO = 0.30;

function looksDegenerate(text = '') {
  const t = String(text);
  if (t.length < DEGENERATE_MIN_CHARS) return false;
  const sentences = t
    .split(/[.!?\n]+\s*/)
    .map(x => x.trim().toLowerCase())
    .filter(x => x.length > 8); // ignore fragments and bullet glyphs
  if (sentences.length < DEGENERATE_MIN_SENTENCES) return false;
  return new Set(sentences).size / sentences.length < DEGENERATE_MAX_UNIQUE_RATIO;
}

/** A failed call worth ONE more attempt. Never codex: its failures are timeouts, and a retry just burns the clock twice. */
function isRetryable(result) {
  if (result.ok) return false;
  if (result.provider === 'codex') return false;
  // Deterministic refusals (privacy gate, budget cap, missing key) return the
  // same answer every time — a retry is pure noise. Observed live: a data-terms
  // refusal was "retried once" the day the gate shipped.
  return !/missing|^data-terms:|^budget:/i.test(String(result.error || ''));
}

/**
 * One PHYSICAL provider call, one ledger row. The only sanctioned path to SEATS.
 *
 * @param {string} seat     seat id (key into SEATS)
 * @param {string} prompt   full prompt as sent
 * @param {object} env      from loadEnv()
 * @param {object} opts     runner options (timeoutMs, effort, …)
 * @param {object} meta     { tag, round, kind, verdicts, strictVerdict, retried, ledgerPath }
 * @param {object} seatsMap injectable for tests; defaults to the real SEATS
 */
async function dispatch(seat, prompt, env, opts = {}, meta = {}, seatsMap = SEATS) {
  const runner = seatsMap[seat];
  if (!runner) throw new Error(`dispatch: unknown seat "${seat}"`);
  // Privacy gate FIRST — before budget, before the network. No ledger row: no
  // physical attempt happened. Only on the real seats map (fake test seats have
  // no roster entry anyway, but keep the symmetry with the budget gate).
  if (seatsMap === SEATS) {
    const refusal = dataTermsRefusal(seat, meta);
    if (refusal) return refusal;
  }
  // THE CEILING LIVES ON THE BOUNDARY (claude-seat review, 2026-08-21). It used
  // to be a single call site in council.js before round 1 — which left round 2,
  // the synthesis fallback chain, and every future caller dispatching metered
  // seats ungated. "No metered call without a gate" enforced by a call site is
  // one new caller away from false; enforced here, it is structural. Per-run
  // exposure was cents, but the property is what matters. Subscription seats
  // never gate (they cannot overrun); meta.forceBudget carries --force-budget.
  // Only applied to the REAL seats map: injected test maps carry fake seats
  // whose ids budget.js cannot price, and unknown-must-not-read-as-free would
  // wrongly gate them.
  if (seatsMap === SEATS && budget.isMetered(seat) && !meta.forceBudget) {
    const g = budget.gate([seat], meta.ledgerPath || DEFAULT_LEDGER);
    if (g.blocked.includes(seat)) {
      // No physical attempt happened, so NO ledger row — a row here would count
      // phantom dispatches into the very total that triggered the block.
      return { provider: seat, model: 'blocked', ok: false, text: '', ms: 0, error: `budget: monthly cap reached ($${g.mtd.usd.toFixed(2)}/$${g.cap}) — metered dispatch refused (--force-budget to override)` };
    }
  }
  let result;
  try {
    result = await runner(prompt, env, opts);
  } catch (e) {
    // A thrown runner is itself a failed dispatch — it still gets a row, because
    // a throw AFTER the provider accepted the request may still have billed.
    result = { provider: seat, model: '?', ok: false, text: '', ms: 0, error: `threw: ${e.message}` };
  }
  // A repetition loop is a FAILURE wearing an answer's clothes. Demote it before
  // anything downstream (quorum count, verdict tally, synthesis input) can treat
  // it as content. The text is kept on the result for forensics.
  if (result.ok && looksDegenerate(result.text)) {
    result.ok = false;
    result.error = `degenerate output: ${result.text.length} chars of looping repetition`;
  }
  if (meta.retried) result.retried = true;
  if (meta.verdicts) result.verdict = extractVerdict(result.text, { strict: Boolean(meta.strictVerdict), binary: Boolean(meta.binaryVerdict) });
  try {
    appendEntry(
      buildEntry(result, { tag: meta.tag || '', promptChars: prompt.length, round: meta.round, kind: meta.kind, decisionMode: meta.decisionMode }),
      meta.ledgerPath,
    );
  } catch (e) {
    // Best-effort by design: a ledger write failure must not kill a run that
    // already paid for its answer. budget.js fails closed on its side instead.
    process.stderr.write(`[dispatch] ledger write failed (${e.message}) — the call itself succeeded\n`);
  }
  return result;
}

/**
 * dispatch() with the council's single-retry policy. BOTH attempts are logged —
 * the first attempt billed real money whether or not the retry saved the seat,
 * and 64 of those first attempts were historically invisible.
 */
async function dispatchWithRetry(seat, prompt, env, opts = {}, meta = {}, seatsMap = SEATS) {
  const first = await dispatch(seat, prompt, env, opts, meta, seatsMap);
  if (!isRetryable(first)) return first;
  process.stderr.write(`[council] ${seat} failed (${first.error}) — retrying once…\n`);
  return dispatch(seat, prompt, env, opts, { ...meta, retried: true }, seatsMap);
}

module.exports = { dispatch, dispatchWithRetry, extractVerdict, isRetryable, looksDegenerate, dataTermsRefusal };
