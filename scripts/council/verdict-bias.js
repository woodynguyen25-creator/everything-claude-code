/**
 * Seat verdict bias — weight a verdict by whether the seat has ever cast its opposite.
 *
 * WHY THIS EXISTS
 * The 2026-08-21 self-audit measured every machine-readable verdict in the ledger:
 *
 *     seat        GO  MODIFY  NO-GO    n
 *     xai          8      13     11   32     <- the only seat using the full range
 *     codex        0      18      8   26     <- has NEVER approved anything
 *     claude       3      22      0   25     <- has NEVER blocked anything
 *
 * The seats are not neutral instruments. `claude` cannot say NO-GO and `codex`
 * cannot say GO, so a lone claude GO is not approval and a lone codex NO-GO is not
 * a block — each is that seat doing the only thing it has ever done. Counting them
 * equally in a tally reads the ROSTER'S SHAPE as evidence about the QUESTION.
 *
 * council.js already flags unanimity, but its prompt is "was the question
 * leading?" — which attributes seat correlation to prompt-leading. Those are two
 * different failure modes sharing one alarm. This module supplies the missing
 * half, computed from the council's own history rather than asserted.
 *
 * ADVISORY ONLY, BY DESIGN. Nothing here blocks a convene or changes a dispatch.
 * A council that refuses to run because it cannot read its own history is worse
 * than one that runs without the annotation, so every failure path here degrades
 * to "no annotation" rather than to an error. That is the opposite of the
 * fail-CLOSED rule in budget.js — deliberately, because the risk is inverted:
 * there, an unknown could cost unbounded money; here, an unknown costs a footnote.
 */
'use strict';

const fs = require('node:fs');

const VERDICTS = ['GO', 'MODIFY', 'NO-GO'];

/**
 * GO and NO-GO are opposites; MODIFY is not the opposite of anything. A seat that
 * only ever answers MODIFY is a different pathology (see the 69%-MODIFY finding),
 * and is reported by rate rather than by this check.
 */
const OPPOSITE = { GO: 'NO-GO', 'NO-GO': 'GO', MODIFY: null };

/**
 * Below this many prior verdicts a seat has no track record worth reasoning from.
 * Set at 8 because the smallest seat with a visibly lopsided record (gemini, 11
 * verdicts, 0 NO-GO) should still be flagged, while a seat with 2 verdicts should
 * not. Raising this hides real bias; lowering it manufactures bias from noise.
 */
const MIN_HISTORY = 8;

/** @returns {Record<string, {GO:number, MODIFY:number, 'NO-GO':number, n:number}>} */
function distribution(ledgerPath) {
  const out = {};
  let raw;
  try {
    raw = fs.readFileSync(ledgerPath, 'utf8');
  } catch {
    // Missing or unreadable history => no annotation. See the ADVISORY note above.
    return out;
  }
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    let row;
    try {
      row = JSON.parse(t);
    } catch {
      continue; // a corrupt row costs one data point, not the whole annotation
    }
    if (!row.verdict || !VERDICTS.includes(row.verdict) || !row.provider) continue;
    if (!out[row.provider]) out[row.provider] = { GO: 0, MODIFY: 0, 'NO-GO': 0, n: 0 };
    out[row.provider][row.verdict] += 1;
    out[row.provider].n += 1;
  }
  return out;
}

/**
 * What does this seat's own record say about the verdict it just cast?
 *
 * @returns {{seat:string, verdict:string, n:number, count:number, rate:number,
 *            opposing:string|null, opposingCount:number, structural:boolean,
 *            thin:boolean, note:string}}
 *   `structural: true` means the seat has never once cast the opposing verdict, so
 *   this one is close to the only thing it could have said.
 */
function assess(seat, verdict, dist) {
  const d = (dist && dist[seat]) || { GO: 0, MODIFY: 0, 'NO-GO': 0, n: 0 };
  const opposing = OPPOSITE[verdict] !== undefined ? OPPOSITE[verdict] : null;
  const opposingCount = opposing ? d[opposing] : 0;
  const count = d[verdict] || 0;
  const thin = d.n < MIN_HISTORY;

  const base = {
    seat, verdict, n: d.n, count,
    rate: d.n > 0 ? count / d.n : 0,
    opposing, opposingCount,
    structural: false, thin,
    note: '',
  };

  if (thin) {
    // Unknown must not render as vetted. A new seat is not a balanced seat.
    base.note = `only ${d.n} prior verdict(s) — too few to judge; treat at face value but unverified`;
    return base;
  }
  if (opposing && opposingCount === 0) {
    base.structural = true;
    base.note = `has NEVER returned ${opposing} in ${d.n} verdicts — this ${verdict} is near-structural, not a judgement`;
    return base;
  }
  base.note = `${count}/${d.n} ${verdict} historically${opposing ? `; has returned ${opposing} ${opposingCount}x` : ''}`;
  return base;
}

/**
 * Read a whole round of verdicts at once.
 *
 * The distinction that matters: unanimity among seats that are each structurally
 * incapable of the opposite verdict is not consensus, it is arithmetic.
 *
 * @param {{provider:string, verdict:string}[]} voted
 * @returns {{unanimous:boolean, verdict:string|null, seats:object[],
 *            structuralCount:number, allStructural:boolean, thinCount:number}}
 */
function assessUnanimity(voted, dist) {
  const valid = (voted || []).filter(v => v && v.verdict && VERDICTS.includes(v.verdict));
  const seats = valid.map(v => assess(v.provider, v.verdict, dist));
  const distinct = new Set(valid.map(v => v.verdict));
  const unanimous = valid.length >= 2 && distinct.size === 1;
  const structuralCount = seats.filter(s => s.structural).length;
  return {
    unanimous,
    verdict: unanimous ? valid[0].verdict : null,
    seats,
    structuralCount,
    // Only meaningful when unanimous: every agreeing seat was going to say this.
    allStructural: unanimous && seats.length > 0 && structuralCount === seats.length,
    thinCount: seats.filter(s => s.thin).length,
  };
}

/** Human-readable lines for the console. Returns [] when there is nothing to say. */
function lines(unanimityResult) {
  const out = [];
  for (const s of unanimityResult.seats) {
    if (s.structural) out.push(`  ⚠ ${s.seat}=${s.verdict}: ${s.note}`);
  }
  if (unanimityResult.allStructural && unanimityResult.unanimous) {
    out.push(`  ⛔ UNANIMOUS ${unanimityResult.verdict} but EVERY agreeing seat has never cast the opposite verdict.`);
    out.push('     This is the roster\'s shape, not evidence about the question. Get a seat that can disagree.');
  }
  return out;
}

module.exports = { VERDICTS, OPPOSITE, MIN_HISTORY, distribution, assess, assessUnanimity, lines };
