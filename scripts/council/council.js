#!/usr/bin/env node
/**
 * council — fan one question out to Woody's paid AI seats in parallel.
 *
 * Usage:
 *   node scripts/council/council.js "Question..." [--to claude,codex,...] [--tag purpose]
 *                                   [--synth] [--rounds 2] [--no-lenses] [--timeout 180]
 *   node scripts/council/council.js "Task..." --workers   # cheap tier, executes a fixed spec
 *   node scripts/council/council.js ledger [N]      # recent dispatches + today's per-provider summary
 *   node scripts/council/health.js                  # probe every seat, exit 1 if a roster seat is down
 *
 * WHO IS IN THE ROSTER: see roster.js. Deliberately NOT repeated here — this
 * header used to list the seats and drifted (2026-08-21 it still advertised
 * Grok 4.5, a LEAD `gemini` seat that had been benched on a privacy finding, and
 * `cerebras` as a worker while it was 402-ing). A comment cannot be kept in sync
 * with a data structure, so it should not try. Print the live roster with:
 *   node scripts/council/health.js            # probes every seat, live
 * Every dispatch is logged to dashboard/data/council-ledger.jsonl.
 *
 * v2 (2026-07-18):
 *  - results stream as each seat finishes (no more waiting on the slowest seat to see anything)
 *  - one automatic retry on transient failures (never for codex — its failures are timeouts)
 *  - role lenses: with 3+ seats each seat answers through a distinct lens (disable with --no-lenses)
 *  - --rounds 2: debate round — each seat critiques the others' answers, then revises
 *  - synthesis falls back through roster.js SYNTH_CHAIN, and truncates seat answers first
 */
'use strict';

const { loadEnv, SEATS } = require('./providers');
const { saveTranscript, readRecent, summarize, DEFAULT_LEDGER } = require('./ledger');
const budget = require('./budget');
const verdictBias = require('./verdict-bias');
// THE dispatch boundary (2026-08-21): every physical provider attempt goes through
// dispatch.js and gets a ledger row - retries, preflights and synthesis fallbacks
// included. council.js never calls SEATS directly for anything that bills.
const { dispatch, dispatchWithRetry, extractVerdict } = require('./dispatch');

// Tiered roster (2026-08-02, Woody's call) — see roster.js for the tier
// rationale and the ledger evidence behind each seat's placement.
const { LEAD_SEATS, WORKER_SEATS, BENCHED_SEATS, SYNTH_CHAIN, AGENT_SEATS, SEAT_BY_ID } = require('./roster');

const DEFAULT_SEATS = LEAD_SEATS;

// Decorrelation lenses — same question, five forced perspectives. Assigned by seat order.
//
// LENS SETS (added 2026-08-03). The default set is written for PRODUCT/BUILD questions, and
// using it on a TRADE question produced a structural bias that took months to notice:
// seat 0 always draws the RED-TEAM lens, seat 0 is `xai` (the strongest seat), and seats 2-3
// draw "USER/CUSTOMER" and "CHEAPEST-VIABLE" — meaningless for a position, so those seats
// defaulted to generic caution. Net effect: the best model was hard-coded to attack, nobody
// was ever assigned to argue FOR the position, and every trade council came back unanimous
// SELL. Unanimity out of a one-sided lens table is an echo, not a confirmation.
//
// The `trading` set fixes that by assigning genuine adversaries and putting BULL on seat 0,
// so the bull case gets the strongest advocate rather than no advocate.
const LENS_SETS = {
  default: [
    'Answer through a RED-TEAM lens: what is wrong, risky, or likely to fail here? Attack the premise itself if it deserves it.',
    'Answer through an IMPLEMENTATION-REALIST lens: what would this actually take to build or do — effort, sequencing, hidden work, dependencies?',
    'Answer through a USER/CUSTOMER lens: how does this land for the end user or buyer — what do they actually need and feel?',
    'Answer through a CHEAPEST-VIABLE lens: what is the simplest, cheapest path to 80% of the value?',
    'Answer through a SECOND-ORDER lens: knock-on effects, incentives created, and what this makes harder or easier later.',
  ],
  trading: [
    'You are the BULL seat. Your job is to build the STRONGEST honest case FOR the position — for holding, adding, or extending the target. Argue it like a portfolio manager who wants to own this. Name the specific catalysts, the flows, the technical structure and the fundamental case that justify more upside, and say what price you think it reaches and by when. You are NOT permitted to conclude "sell" — if you genuinely believe the bull case is unsalvageable, say exactly which single fact kills it and stop. Do not hedge. Someone else is assigned to argue the other side.',
    'You are the BEAR seat. Your job is to build the STRONGEST honest case AGAINST the position — for selling now or cutting size. Name the specific mechanism that takes the price down, the level that confirms it, and the timeframe. You are NOT permitted to conclude "hold". Do not hedge. Someone else is assigned to argue the other side.',
    'You are the QUANT seat. NUMBERS ONLY. Recompute the packet\'s math independently and say where you get a different answer. Probabilities, expected value, break-evens, position sizing, spread and slippage costs, decay. Flag any figure in the packet you believe is wrong or misleading, and show the corrected arithmetic. You are FORBIDDEN from making a directional recommendation — if the numbers favour one side, present the numbers and let them speak.',
    'You are the RISK seat. Ignore direction entirely — assume the thesis is correct and ask only what happens if it is not. Concentration, ruin risk, gap risk, correlation to other exposure, worst realistic drawdown, and whether the position size is defensible on its own terms. Your only question is "what kills the account", not "what makes money".',
    'You are the HISTORIAN seat. Judge this ONLY against the operator\'s own measured track record as given in the packet. What has actually happened the last N times he was in a setup like this one? Where does the packet\'s framing contradict his own data? Be specific that you are reasoning from his record, not from general market wisdom — and if his record contradicts the consensus view in the packet, say so plainly.',
  ],
};
const LENSES = LENS_SETS.default;

// Synthesis seat order lives in roster.js so it cannot drift out of sync with the
// tiers. It USED to be hardcoded here as ['deepseek','xai','cerebras'] — and had
// already rotted: cerebras was benched on HTTP 402, so the last-resort synthesiser
// could not answer and the failure read as a payment error instead of "no synth
// seat available". Benching a seat now removes it from synthesis automatically.
const SYNTH_FALLBACK_CHAIN = SYNTH_CHAIN;
const SYNTH_BLOCK_MAX_CHARS = 6000; // per-seat cap fed into the synthesis prompt
const DEBATE_BLOCK_MAX_CHARS = 4000; // per-seat cap fed into round-2 prompts

function truncate(text, max) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max)}\n[…truncated ${text.length - max} chars]`;
}

function parseArgs(argv) {
  const args = { question: '', to: DEFAULT_SEATS, tag: '', synth: false, timeoutS: 240, rounds: 1, lenses: true, lensSet: 'default', force: false, forceBudget: false, decide: false };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--to') args.to = String(argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
    // --workers swaps the LEAD roster for the WORKER roster: cheap seats
    // executing an already-decided spec. Lenses off by default — workers are
    // meant to converge on the spec, not diverge from it.
    else if (a === '--workers') { args.to = WORKER_SEATS; args.lenses = false; }
    else if (a === '--tag') args.tag = String(argv[++i] || '');
    else if (a === '--synth') args.synth = true;
    else if (a === '--rounds') args.rounds = Math.max(1, Math.min(2, Number(argv[++i]) || 1));
    else if (a === '--no-lenses') args.lenses = false;
    // --trading swaps the product/build lens table for adversarial BULL/BEAR/QUANT/RISK/
    // HISTORIAN seats. Use it for ANY position or market question.
    else if (a === '--trading') args.lensSet = 'trading';
    else if (a === '--lens-set') args.lensSet = String(argv[++i] || 'default');
    else if (a === '--timeout') args.timeoutS = Number(argv[++i]) || 240;
    else if (a === '--sol-effort') args.solEffort = ['medium', 'high', 'xhigh'].includes(String(argv[++i])) ? argv[i] : '';
    // Skip the API-seat preflight and convene regardless (e.g. deliberately
    // convening a degraded council, or when the preflight itself is suspect).
    else if (a === '--force') args.force = true;
    // DELIBERATELY SEPARATE from --force. The audit (2026-08-21) found --force was
    // both the preflight-failure workaround AND the spend-cap override, so the
    // documented recovery for a dead API key silently disabled the only ceiling.
    // Overriding a health check and authorising more spend are different decisions.
    else if (a === '--force-budget') args.forceBudget = true;
    // Decision mode: force every seat to end with a machine-readable
    // VERDICT line, tally the verdicts, and persist them to the ledger so
    // the council's dissent rate becomes measurable over time.
    else if (a === '--decide') args.decide = true;
    // --binary: decision mode WITHOUT the MODIFY escape. MODIFY is 69% of all
    // recorded verdicts, and the codex review argued it has reopened the
    // 'it depends' hatch --decide exists to close: 'not ready' is a NO-GO with a
    // named blocker, not a third bucket. Kept as an OPT-IN flag rather than the
    // default so the two modes can be compared on the ledger before deciding.
    else if (a === '--binary') { args.decide = true; args.binary = true; }
    else rest.push(a);
  }
  args.question = rest.join(' ').trim();
  return args;
}

function printLedger(n) {
  const recent = readRecent(n);
  if (recent.length === 0) {
    console.log(`(ledger empty: ${DEFAULT_LEDGER})`);
    return;
  }
  for (const e of recent) {
    const status = e.ok ? 'ok' : `FAIL ${e.error || ''}`;
    console.log(`${e.ts}  ${e.provider.padEnd(8)} ${String(e.ms).padStart(6)}ms  ${String(e.outputChars).padStart(6)}ch  ${e.tag || '-'}  ${status}`);
  }
  const today = summarize(readRecent(2000));
  console.log('\nToday per provider (UTC day):');
  for (const [p, s] of Object.entries(today)) {
    console.log(`  ${p.padEnd(8)} ${s.calls} calls, ${s.ok} ok, ${(s.ms / 1000).toFixed(0)}s total, ~${Math.ceil(s.outputChars / 4)} output tokens`);
  }
}

function printResult(result, label = '') {
  const tagStr = label ? ` ${label}` : '';
  console.log(`\n===== ${result.provider.toUpperCase()}${tagStr} (${result.model}, ${(result.ms / 1000).toFixed(1)}s${result.retried ? ', retried' : ''}) =====`);
  console.log(result.ok ? result.text : `[FAILED: ${result.error}]`);
}

/** Synthesis with a provider fallback chain instead of a hardcoded single seat. */
async function synthesize(question, results, env, tag = '') {
  const blocks = results
    .filter(r => r.ok)
    .map(r => `--- ${r.provider.toUpperCase()} (${r.model}) ---\n${truncate(r.text, SYNTH_BLOCK_MAX_CHARS)}`)
    .join('\n\n');
  const prompt = `Multiple AI models answered the same question. Synthesize for the human director:\n1. CONSENSUS — points most/all agree on (terse bullets).\n2. DISAGREEMENTS — where they diverge, who says what, and which position looks stronger.\n3. UNIQUE — any insight only one model surfaced that deserves attention.\nNo preamble.\n\nQUESTION: ${question}\n\nANSWERS:\n${blocks}`;
  let last = { provider: 'synth', model: 'none', ok: false, text: '', ms: 0, error: 'no synth seat available' };
  for (const seat of SYNTH_FALLBACK_CHAIN) {
    // Through the dispatch boundary: a FAILED fallback attempt billed too, and
    // used to vanish - only the final result ever reached the ledger.
    last = await dispatch(seat, prompt, env, { timeoutMs: 120_000 }, { tag: `${tag}#synth`, kind: 'synth' });
    if (last.ok) return last;
    process.stderr.write(`[council] synth via ${seat} failed (${last.error}) - falling back…` + '\n');
  }
  return last;
}

/** Debate round: each seat sees the others' round-1 answers, critiques, and revises. */
async function debateRound(question, seats, round1, env, seatOpts, tag, decideSuffix) {
  const okResults = round1.filter(r => r.ok);
  if (okResults.length < 2) {
    process.stderr.write('[council] fewer than 2 seats answered — skipping debate round\n');
    return round1;
  }
  console.log('\n[council] round 2: debate …');
  const promises = seats.map((seat, i) => {
    const mine = round1[i];
    if (!mine.ok) return Promise.resolve(mine); // a seat that failed round 1 sits the debate out
    const others = okResults
      .filter(r => r !== mine)
      .map(r => `--- ${r.provider.toUpperCase()} ---\n${truncate(r.text, DEBATE_BLOCK_MAX_CHARS)}`)
      .join('\n\n');
    const prompt = `QUESTION: ${question}\n\nYOUR ROUND-1 ANSWER:\n${truncate(mine.text, DEBATE_BLOCK_MAX_CHARS)}\n\nOTHER COUNCIL MEMBERS' ANSWERS:\n${others}\n\nROUND 2: Where are the others wrong or missing something you caught? Where are they right and you were wrong? Then give your REVISED final answer. Be terse — revised answer only needs what changed plus your final position.${decideSuffix}`;
    // ^ decideSuffix WAS MISSING here (found by the claude seat reviewing this
    // pass, 2026-08-21): under --decide --rounds 2 no seat was ever ASKED for a
    // round-2 verdict, extraction was nonetheless strict, and finalResults is
    // replaced by round 2 — so the tally ran over answers that were never asked
    // to vote. Also: the other seats' round-1 answers quoted above CONTAIN their
    // VERDICT lines, so loose extraction would misattribute a quoted verdict —
    // strict-last-3-lines plus an explicit re-ask is the only sound combination.
    // seatOpts, NOT the bare global opts. Round 2 previously used the global
    // timeout WITHOUT the CLI floors, so codex entered every debate round with
    // the 240s default against its own 480s p90 - 7 of its ledger timeouts are
    // at exactly 240000ms. The debate round was structurally rigged to kill its
    // slowest seat. Found in the 2026-08-21 full-system review.
    return dispatchWithRetry(seat, prompt, env, seatOpts(seat),
      { tag: `${tag}#r2`, round: 2, kind: 'debate', verdicts: true, strictVerdict: Boolean(decideSuffix) }).then(r => {
      printResult(r, 'R2');
      return r;
    });
  });
  return Promise.all(promises);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'ledger') {
    printLedger(Number(argv[1]) || 20);
    return;
  }

  const args = parseArgs(argv);
  if (!args.question) {
    console.error(`Usage: council.js "Question..." [--to seat,seat] [--workers] [--tag purpose] [--synth] [--rounds 2] [--no-lenses] [--trading] [--timeout 240] [--sol-effort medium|high|xhigh] [--force] [--force-budget] [--decide] [--binary]`);
    console.error(`  LEAD (default): ${LEAD_SEATS.join(', ')}`);
    console.error(`  WORKER (--workers): ${WORKER_SEATS.join(', ')}`);
    console.error(`  BENCHED (callable via --to, excluded from rosters): ${BENCHED_SEATS.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const unknown = args.to.filter(s => !SEATS[s]);
  if (unknown.length > 0) {
    console.error(`Unknown seat(s): ${unknown.join(', ')}. Known: ${Object.keys(SEATS).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const env = loadEnv();

  // 245 of the first 1,177 ledger entries (21%) were untagged, which makes the
  // ledger unauditable exactly where audits matter. Nag, never block.
  if (!args.tag) console.log('[council] note: untagged convene - pass --tag <purpose> so this run is auditable in the ledger');

  // BUDGET GATE - and it runs BEFORE the preflight, not after. The preflight
  // pings METERED seats, so the old order meant an over-cap council still
  // billed xai/deepseek/groq one PONG each before the ceiling was ever
  // consulted - metered spend dispatched outside the only control on metered
  // spend (2026-08-21 review). Subscription seats are never blocked: they
  // cannot overrun, and cutting them off when the metered budget is exhausted
  // would disable the free tier exactly when it is the only affordable option.
  const budgetGate = budget.gate(args.to, DEFAULT_LEDGER, { force: args.forceBudget });
  console.log(`[council] ${budget.line(budgetGate.mtd, budgetGate.cap)}`);
  if (budgetGate.over) {
    if (budgetGate.blocked.length) {
      console.log(`[council] ⛔ MONTHLY CAP REACHED - metered seats skipped: ${budgetGate.blocked.join(', ')}`);
      console.log('[council]    subscription-metered seats still run. Override with --force-budget, or raise COUNCIL_MONTHLY_CAP_USD.');
      args.to = budgetGate.allowed;
    }
    if (!args.to.length) {
      console.log('[council] every requested seat is metered and the cap is reached. Aborting rather than billing.');
      process.exit(2);
    }
  }

  // ── API-seat preflight ─────────────────────────────────────────────────
  // Fires ONLY when the dispatch includes an agent-CLI seat (codex boots a
  // ~60-480s agent session): a dead API key discovered mid-convene wastes the
  // whole CLI spend, and the degraded-quorum alarm can only say so AFTER the
  // money is gone. A ~1s parallel ping converts that into a free abort.
  // NOT done for pure-API dispatches: the dispatch is as cheap as the ping,
  // and on rate-limited free tiers doubling requests is how the health check
  // once manufactured its own outage.
  // The CLI set is roster.AGENT_SEATS - it was a hardcoded local Set here and
  // had already drifted from the roster once (2026-08-21 review).
  const cliInRoster = args.to.some(x => AGENT_SEATS.includes(x));
  const apiSeats = args.to.filter(x => !AGENT_SEATS.includes(x));
  if (cliInRoster && apiSeats.length > 0 && !args.force) {
    const pings = await Promise.all(apiSeats.map(seat =>
      // Through the dispatch boundary: preflight PONGs are metered spend and
      // were previously invisible to both the ledger and the cap.
      dispatch(seat, 'Reply with exactly one word: PONG', env, { timeoutMs: 15_000 }, { tag: 'preflight', kind: 'preflight' })
        .then(r => ({ seat, ok: Boolean(r.ok), error: r.error }))
        .catch(e => ({ seat, ok: false, error: e.message })),
    ));
    const deadApi = pings.filter(x => !x.ok);
    if (deadApi.length > 0) {
      console.error('[council] PREFLIGHT FAILED - refusing to convene (the CLI seats are the expensive part; fix the cheap seats first):');
      for (const d of deadApi) console.error(`  DOWN ${d.seat}: ${String(d.error || '').slice(0, 100)}`);
      console.error('[council] Diagnose: node scripts/council/health.js · Convene anyway: --force');
      process.exitCode = 1;
      return;
    }
  }

  // codex (Sol) boots a full agent session (MCP servers + AGENTS.md + skills + doctrine block)
  // on every call — ~10x slower than the pure-API seats (a trivial call = ~60s/41k tokens).
  // Give it a floor so a short global --timeout can't guillotine it before it answers.
  // Per-seat timeout FLOORS for CLI seats that boot a whole agent session
  // before answering, so a short global --timeout can't guillotine them.
  // claude measured ~8s on a trivial prompt but boots MCP servers + skills on
  // real ones; codex is far worse (182s average, 600s hard timeouts observed).
  // RAISED 2026-08-21 from { codex: 600, claude: 300 }. Sized to cover each seat's
  // measured p99, from this repo's ledger (SUCCESSFUL calls only):
  //
  //   claude  n=66   86% ok   med 204s   p90 366s   p99 453s   -> 600s
  //   codex   n=183  83% ok   med 112s   p90 480s   p99 840s   -> 900s
  //
  // ⚠ CORRECTION. An earlier version of this comment, and the commit that
  // introduced it, claimed "both caps sat BELOW the p90 of their own successful
  // calls". That is TRUE FOR CLAUDE ONLY (300s cap vs 366s p90). It is FALSE for
  // codex: its old 600s cap was ABOVE its 480s p90. Caught by the codex seat
  // reviewing this change. The codex cap is therefore justified by p99 (840s), not
  // by p90 — a weaker argument than the one originally given, and codex was
  // initially set to 1200s on that bad reasoning. Corrected to 900s: it covers p99
  // with margin without imposing a 20-minute floor on every default convene, since
  // round 1 is a Promise.all and one slow LEAD seat holds the entire result.
  //
  // The claude half stands and bit twice in one day: a live convene logged
  // "claude failed (timeout after 300000ms) — retrying once", then timed out again.
  // 20 claude calls finished between 240s and 300s — barely under the old cap.
  //
  // ⚠ DO NOT read the timeout count as recoverable failures. Of codex's 24 timeouts
  // only 10 were at the 600s default; 7 were at 240s and 5 at 300s (runs that passed
  // an explicitly LOWER --timeout), and 1 each at 900s and 1200s — those would not
  // have survived this change either. Any "ceiling reliability" figure computed by
  // assuming every timed-out call would have finished is an optimistic upper bound,
  // not an expected rate.
  //
  // Still worth the headroom: codex never retries (its failures ARE timeouts, so a
  // retry just burns the clock twice), so a cut-off call costs the full wait and
  // returns nothing. Both seats are subscription-metered — waiting costs $0, only
  // wall-clock. Override per-run with --timeout.
  const CLI_MIN_TIMEOUT_S = { codex: 900, claude: 600 };
  // Woody 8/06: Sol's depth is tiered — 'medium' for quick market scans, 'high' default,
  // 'xhigh' for his real position ideas (xhigh was the 7/26 timeout cause; when used,
  // pair it with --timeout 900+; the codex floor below already guarantees 600s).
  const seatOpts = seat => ({
    timeoutMs: Math.max(args.timeoutS, CLI_MIN_TIMEOUT_S[seat] || 0) * 1000,
    ...(seat === 'codex' && args.solEffort ? { effort: args.solEffort } : {}),
  });
  const useLenses = args.lenses && args.to.length >= 3; // 1-2 seats = targeted ask, lenses off
  const lensTable = LENS_SETS[args.lensSet] || LENS_SETS.default;
  const lensNames = args.lensSet === 'trading'
    ? ['BULL', 'BEAR', 'QUANT', 'RISK', 'HISTORIAN'] : null;
  const lensLabel = useLenses
    ? (lensNames
        ? ` — ${args.to.map((s, i) => `${s}=${lensNames[i % lensNames.length]}`).join(' ')}`
        : ' (role lenses on)')
    : '';
  console.log(`[council] dispatching to ${args.to.join(', ')}${lensLabel} — results stream as seats finish …`);

  // Decision mode: every seat must END with a verdict it can be held to.
  // "It depends" is the yes-man's exit hatch — close it. Extraction is STRICT in
  // this mode (dispatch.js): the VERDICT line must sit in the last 3 non-empty
  // lines, so a seat cannot "decide" in paragraph two and hedge for ten more.
  const decideSuffix = args.binary
    ? '\n\n[DECISION MODE — BINARY] End your answer with exactly one line: "VERDICT: GO" or "VERDICT: NO-GO" followed by " — " and a one-clause reason. There is no MODIFY: if the work is not ready, that is NO-GO, and the clause must name the single blocker.'
    : args.decide
      ? '\n\n[DECISION MODE] End your answer with exactly one line: "VERDICT: GO", "VERDICT: NO-GO", or "VERDICT: MODIFY" followed by " — " and a one-clause reason. You MUST pick one; "it depends" is not a verdict. If you pick MODIFY, the clause must name the single change that flips you to GO.'
      : '';

  // Snapshot each seat's PRIOR verdict record before dispatching. Ledger rows are
  // now written per-dispatch, so reading this after the round would score a seat
  // against a distribution that already contains the verdict being scored.
  const priorVerdicts = args.decide ? verdictBias.distribution(DEFAULT_LEDGER) : {};

  const round1 = await Promise.all(args.to.map((seat, i) => {
    // Seat identity + lens travel together. The lens forces a PERSPECTIVE; the
    // role line tells the seat what JOB it holds in this system (from roster.js),
    // so a red-team lens on the CONTRARIAN seat reads as its mandate rather than
    // an arbitrary costume. Only with 3+ seats — a 1-2 seat ask is targeted.
    const roleLine = useLenses && SEAT_BY_ID[seat] ? `\n\n[YOUR SEAT] ${SEAT_BY_ID[seat].role}` : '';
    // API seats get told, EVERY time, that they have no tools. Twice in one day
    // (2026-08-21) a brief invited seats to "verify against the tree" and xai —
    // a raw HTTPS call — burned the dispatch narrating file reads it cannot do;
    // the second time it looped one intent sentence for 21,876 chars. The seat
    // cannot know what it is unless the dispatch says so.
    const toolLine = SEAT_BY_ID[seat] && SEAT_BY_ID[seat].toolAccess === 'api'
      ? '\n[NO TOOLS] You have NO filesystem, command, or browsing access. Do not attempt or narrate file/tool operations — reason only from what is in this prompt, and state when a claim would need verification you cannot perform.'
      : '';
    const lens = useLenses ? `${roleLine}${toolLine}\n[LENS — apply to your answer] ${lensTable[i % lensTable.length]}` : toolLine;
    return dispatchWithRetry(seat, args.question + lens + decideSuffix, env, seatOpts(seat),
      { tag: args.tag, round: 1, kind: 'convene', verdicts: true, strictVerdict: args.decide }).then(r => {
      printResult(r);
      return r;
    });
  }));

  let finalResults = round1;
  if (args.rounds >= 2) {
    finalResults = await debateRound(args.question, args.to, round1, env, seatOpts, args.tag, decideSuffix);
  }

  const transcriptResults = [...finalResults];
  if (args.synth) {
    const synth = await synthesize(args.question, finalResults, env, args.tag);
    transcriptResults.push({ ...synth, provider: `${synth.provider} (SYNTHESIS)` });
    console.log(`\n===== SYNTHESIS (${synth.provider}/${synth.model}) =====`);
    console.log(synth.ok ? synth.text : `[FAILED: ${synth.error}]`);
  }

  // Ledger rows are already on disk — each dispatch is appended the moment it
  // returns (2026-08-21). They used to be batched here at the end, which meant any
  // death before this line billed real money and recorded NOTHING: budget.js sums
  // these rows, so a crashed run made month-to-date read LOW and the cap fire LATE,
  // in exactly the runaway case the cap exists to catch.
  //
  // Transcripts still land here because they are a whole-run artifact, not a
  // per-dispatch one. Verdicts used to survive only as long as terminal scrollback.
  const transcript = saveTranscript(transcriptResults, { tag: args.tag, question: args.question });
  const okCount = finalResults.filter(r => r.ok).length;
  console.log(`\n[council] ${okCount}/${finalResults.length} seats answered · ledger: ${DEFAULT_LEDGER}`);

  if (args.decide) {
    const voted = finalResults.filter(r => r.ok && r.verdict);
    const tally = {};
    for (const r of voted) tally[r.verdict] = (tally[r.verdict] || 0) + 1;
    console.log(`[council] VERDICTS: ${voted.map(r => `${r.provider}=${r.verdict}`).join('  ') || '(none parsed)'}`);
    const silent = finalResults.filter(r => r.ok && !r.verdict).map(r => r.provider);
    if (silent.length > 0) console.log(`[council] no verdict line parsed from: ${silent.join(', ')} — read their answers, do not assume assent`);
    // Unanimity is evidence-suspicious, not reassuring: the council's value is
    // DECORRELATED error, and 3+ seats landing identically is the signature of
    // an echo (shared framing, a leading question, or correlated seats) as
    // often as it is a genuinely one-sided question. Flag it; the human decides.
    // SEAT BIAS, measured from the council's own history rather than asserted.
    // The 8/21 self-audit found the seats are not neutral instruments: claude has
    // returned NO-GO 0 times in 25 verdicts and codex has returned GO 0 times in 26.
    // A verdict from a seat that has never cast its opposite is close to the only
    // thing that seat could have said, so counting it equally in the tally reads
    // the ROSTER'S SHAPE as evidence about the QUESTION.
    const biasReport = verdictBias.assessUnanimity(
      voted.map(r => ({ provider: r.provider, verdict: r.verdict })),
      priorVerdicts,
    );
    const biasLines = verdictBias.lines(biasReport);
    if (biasLines.length) {
      console.log("[council] seat-bias check (from this ledger's own verdict history):");
      for (const l of biasLines) console.log(l);
    }

    // silent.length check (claude seat, 2026-08-21): a seat whose verdict fails
    // to PARSE silently leaves `voted`, so two dissenters with unparsed verdicts
    // plus three agreeing seats read as "UNANIMOUS" — a parsing rule
    // manufacturing consensus in a system whose whole thesis is decorrelated
    // dissent. No unanimity claim while any answering seat has no parsed verdict.
    if (voted.length >= 3 && Object.keys(tally).length === 1 && silent.length === 0) {
      const v = voted[0].verdict;
      // Two DIFFERENT failure modes used to share this one alarm. Separate them:
      // "the seats always say this" is not the same problem as "the question was
      // leading", and the fix for each is different (change the roster vs. change
      // the prompt).
      if (biasReport.allDominant) {
        console.log(`[council] ⛔ UNANIMOUS ${v} — but that is the DEFAULT answer of every agreeing seat.`);
        console.log('[council]    This is SEAT CORRELATION, not consensus. Re-run including a seat whose norm differs (xai uses the full range).');
      } else {
        console.log(`[council] ⚠ UNANIMOUS ${v} (${voted.length}/${voted.length}). Before acting, ask: was the question leading? ` +
          'Would the opposite framing also come back unanimous?' +
          (voted.some(r => r.provider === 'claude') ? ' Note: the claude seat is the LEAST decorrelated seat — its agreement is near-zero evidence.' : ''));
      }
    }
  }
  if (transcript) console.log(`[council] full text saved: ${transcript}`);

  // Silent quorum shortfall is how the gemini seat stayed dead for six days:
  // a failed seat printed one "[FAILED: …]" line among pages of output and the
  // run still looked successful. A council answering with fewer seats than
  // requested is a DIFFERENT (worse-evidenced) council, so say so loudly and
  // exit non-zero — a reduced quorum should never read as a clean result.
  const dead = finalResults.filter(r => !r.ok);
  if (dead.length > 0) {
    console.log(`\n${'!'.repeat(64)}`);
    console.log(`[council] DEGRADED QUORUM — ${dead.length} of ${finalResults.length} seat(s) DOWN:`);
    for (const d of dead) {
      console.log(`  ✗ ${d.provider.padEnd(11)} ${String(d.error || 'unknown error').replace(/\s+/g, ' ').slice(0, 100)}`);
    }
    console.log('[council] Treat this verdict as weaker evidence than a full quorum.');
    console.log('[council] Diagnose with: node scripts/council/health.js');
    console.log(`${'!'.repeat(64)}`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(`[council] fatal: ${err.message}`);
  process.exitCode = 1;
});
