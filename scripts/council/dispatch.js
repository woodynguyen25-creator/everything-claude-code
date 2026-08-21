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

module.exports = { dispatch, dispatchWithRetry, extractVerdict, isRetryable };
