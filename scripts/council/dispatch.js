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
const { buildEntry, appendEntry } = require('./ledger');

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
function extractVerdict(text, { strict = false } = {}) {
  const src = String(text || '');
  const scope = strict
    ? src.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(-3).join('\n')
    : src;
  const matches = scope.match(/VERDICT:\s*(GO|NO-?GO|MODIFY)/gi);
  if (!matches) return null;
  return matches[matches.length - 1].replace(/VERDICT:\s*/i, '').toUpperCase().replace('NOGO', 'NO-GO');
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
  return !/missing/i.test(String(result.error || '')); // a missing API key will not fix itself
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
  if (meta.verdicts) result.verdict = extractVerdict(result.text, { strict: Boolean(meta.strictVerdict) });
  try {
    appendEntry(
      buildEntry(result, { tag: meta.tag || '', promptChars: prompt.length, round: meta.round, kind: meta.kind }),
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

module.exports = { dispatch, dispatchWithRetry, extractVerdict, isRetryable, looksDegenerate };
