#!/usr/bin/env node
/**
 * council — fan one question out to Woody's paid AI seats in parallel.
 *
 * Usage:
 *   node scripts/council/council.js "Question..." [--to codex,deepseek,...] [--tag purpose]
 *                                   [--synth] [--rounds 2] [--no-lenses] [--timeout 180]
 *   node scripts/council/council.js ledger [N]      # show recent dispatches + today's per-provider summary
 *
 * Seats: codex (GPT-5.6 Sol CLI) · xai (Grok 4.5) · deepseek · cerebras · groq
 * Every dispatch is logged to dashboard/data/council-ledger.jsonl.
 *
 * v2 (2026-07-18):
 *  - results stream as each seat finishes (no more waiting on the slowest seat to see anything)
 *  - one automatic retry on transient failures (never for codex — its failures are timeouts)
 *  - role lenses: with 3+ seats each seat answers through a distinct lens (disable with --no-lenses)
 *  - --rounds 2: debate round — each seat critiques the others' answers, then revises
 *  - synthesis falls back deepseek → xai → cerebras, and truncates seat answers first
 */
'use strict';

const { loadEnv, SEATS } = require('./providers');
const { buildEntry, appendEntries, readRecent, summarize, DEFAULT_LEDGER } = require('./ledger');

// Roster tuned 2026-07-01: Gemini dropped (out of funds + rate-limited/429s). DeepSeek = best paid value;
// Cerebras + Groq = free, fast breadth seats (both confirmed working). Codex = deepest. Re-add gemini only if refunded.
const DEFAULT_SEATS = ['codex', 'xai', 'deepseek', 'cerebras', 'groq'];

// Decorrelation lenses — same question, five forced perspectives. Assigned by seat order.
const LENSES = [
  'Answer through a RED-TEAM lens: what is wrong, risky, or likely to fail here? Attack the premise itself if it deserves it.',
  'Answer through an IMPLEMENTATION-REALIST lens: what would this actually take to build or do — effort, sequencing, hidden work, dependencies?',
  'Answer through a USER/CUSTOMER lens: how does this land for the end user or buyer — what do they actually need and feel?',
  'Answer through a CHEAPEST-VIABLE lens: what is the simplest, cheapest path to 80% of the value?',
  'Answer through a SECOND-ORDER lens: knock-on effects, incentives created, and what this makes harder or easier later.',
];

const SYNTH_FALLBACK_CHAIN = ['deepseek', 'xai', 'cerebras'];
const SYNTH_BLOCK_MAX_CHARS = 6000; // per-seat cap fed into the synthesis prompt
const DEBATE_BLOCK_MAX_CHARS = 4000; // per-seat cap fed into round-2 prompts

function truncate(text, max) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max)}\n[…truncated ${text.length - max} chars]`;
}

function parseArgs(argv) {
  const args = { question: '', to: DEFAULT_SEATS, tag: '', synth: false, timeoutS: 240, rounds: 1, lenses: true };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--to') args.to = String(argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--tag') args.tag = String(argv[++i] || '');
    else if (a === '--synth') args.synth = true;
    else if (a === '--rounds') args.rounds = Math.max(1, Math.min(2, Number(argv[++i]) || 1));
    else if (a === '--no-lenses') args.lenses = false;
    else if (a === '--timeout') args.timeoutS = Number(argv[++i]) || 240;
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

function isRetryable(result) {
  if (result.ok) return false;
  if (result.provider === 'codex') return false; // codex failures are timeouts; a retry doubles the wait
  return !/missing/i.test(String(result.error || '')); // missing API key will not fix itself
}

/** One seat call with a single retry on transient failure. */
async function callSeat(seat, prompt, env, opts) {
  let result = await SEATS[seat](prompt, env, opts);
  if (isRetryable(result)) {
    process.stderr.write(`[council] ${seat} failed (${result.error}) — retrying once…\n`);
    result = await SEATS[seat](prompt, env, opts);
    result.retried = true;
  }
  return result;
}

function printResult(result, label = '') {
  const tagStr = label ? ` ${label}` : '';
  console.log(`\n===== ${result.provider.toUpperCase()}${tagStr} (${result.model}, ${(result.ms / 1000).toFixed(1)}s${result.retried ? ', retried' : ''}) =====`);
  console.log(result.ok ? result.text : `[FAILED: ${result.error}]`);
}

/** Synthesis with a provider fallback chain instead of a hardcoded single seat. */
async function synthesize(question, results, env) {
  const blocks = results
    .filter(r => r.ok)
    .map(r => `--- ${r.provider.toUpperCase()} (${r.model}) ---\n${truncate(r.text, SYNTH_BLOCK_MAX_CHARS)}`)
    .join('\n\n');
  const prompt = `Multiple AI models answered the same question. Synthesize for the human director:\n1. CONSENSUS — points most/all agree on (terse bullets).\n2. DISAGREEMENTS — where they diverge, who says what, and which position looks stronger.\n3. UNIQUE — any insight only one model surfaced that deserves attention.\nNo preamble.\n\nQUESTION: ${question}\n\nANSWERS:\n${blocks}`;
  let last = { provider: 'synth', model: 'none', ok: false, text: '', ms: 0, error: 'no synth seat available' };
  for (const seat of SYNTH_FALLBACK_CHAIN) {
    last = await SEATS[seat](prompt, env, { timeoutMs: 120_000 });
    if (last.ok) return last;
    process.stderr.write(`[council] synth via ${seat} failed (${last.error}) — falling back…\n`);
  }
  return last;
}

/** Debate round: each seat sees the others' round-1 answers, critiques, and revises. */
async function debateRound(question, seats, round1, env, opts, tag, entries) {
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
    const prompt = `QUESTION: ${question}\n\nYOUR ROUND-1 ANSWER:\n${truncate(mine.text, DEBATE_BLOCK_MAX_CHARS)}\n\nOTHER COUNCIL MEMBERS' ANSWERS:\n${others}\n\nROUND 2: Where are the others wrong or missing something you caught? Where are they right and you were wrong? Then give your REVISED final answer. Be terse — revised answer only needs what changed plus your final position.`;
    return callSeat(seat, prompt, env, opts).then(r => {
      printResult(r, 'R2');
      entries.push(buildEntry(r, { tag: `${tag}#r2`, promptChars: prompt.length, round: 2 }));
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
    console.error('Usage: council.js "Question..." [--to codex,deepseek,cerebras,groq,xai] [--tag purpose] [--synth] [--rounds 2] [--no-lenses] [--timeout 180]');
    process.exitCode = 1;
    return;
  }
  const unknown = args.to.filter(s => !SEATS[s]);
  if (unknown.length > 0) {
    console.error(`Unknown seat(s): ${unknown.join(', ')}. Known: ${Object.keys(SEATS).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  if (args.to.includes('gemini')) {
    process.stderr.write('[council] WARNING: gemini was dropped from the roster 2026-07-01 (out of funds, 41% historical failure rate) — expect failures\n');
  }

  const env = loadEnv();
  const opts = { timeoutMs: args.timeoutS * 1000 };
  const useLenses = args.lenses && args.to.length >= 3; // 1-2 seats = targeted ask, lenses off
  console.log(`[council] dispatching to ${args.to.join(', ')}${useLenses ? ' (role lenses on)' : ''} — results stream as seats finish …`);

  const entries = [];
  const round1 = await Promise.all(args.to.map((seat, i) => {
    const lens = useLenses ? `\n\n[LENS — apply to your answer] ${LENSES[i % LENSES.length]}` : '';
    return callSeat(seat, args.question + lens, env, opts).then(r => {
      printResult(r);
      entries.push(buildEntry(r, { tag: args.tag, promptChars: args.question.length, round: 1 }));
      return r;
    });
  }));

  let finalResults = round1;
  if (args.rounds >= 2) {
    finalResults = await debateRound(args.question, args.to, round1, env, opts, args.tag, entries);
  }

  if (args.synth) {
    const synth = await synthesize(args.question, finalResults, env);
    entries.push(buildEntry(synth, { tag: `${args.tag}#synth`, promptChars: args.question.length }));
    console.log(`\n===== SYNTHESIS (${synth.provider}/${synth.model}) =====`);
    console.log(synth.ok ? synth.text : `[FAILED: ${synth.error}]`);
  }

  appendEntries(entries);
  const okCount = finalResults.filter(r => r.ok).length;
  console.log(`\n[council] ${okCount}/${finalResults.length} seats answered · ledger: ${DEFAULT_LEDGER}`);
}

main().catch(err => {
  console.error(`[council] fatal: ${err.message}`);
  process.exitCode = 1;
});
