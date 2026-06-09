#!/usr/bin/env node
/**
 * council — fan one question out to Woody's paid AI seats in parallel.
 *
 * Usage:
 *   node scripts/council/council.js "Question..." [--to codex,gemini,deepseek] [--tag purpose] [--synth] [--timeout 180]
 *   node scripts/council/council.js ledger [N]      # show recent dispatches + today's per-provider summary
 *
 * Seats: codex (GPT-5.5 CLI) · gemini · deepseek · cerebras · groq
 * Every dispatch is logged to dashboard/data/council-ledger.jsonl.
 */
'use strict';

const { loadEnv, SEATS } = require('./providers');
const { buildEntry, appendEntries, readRecent, summarize, DEFAULT_LEDGER } = require('./ledger');

const DEFAULT_SEATS = ['codex', 'gemini', 'deepseek'];

function parseArgs(argv) {
  const args = { question: '', to: DEFAULT_SEATS, tag: '', synth: false, timeoutS: 240 };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--to') args.to = String(argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--tag') args.tag = String(argv[++i] || '');
    else if (a === '--synth') args.synth = true;
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
  console.log('\nToday per provider:');
  for (const [p, s] of Object.entries(today)) {
    console.log(`  ${p.padEnd(8)} ${s.calls} calls, ${s.ok} ok, ${(s.ms / 1000).toFixed(0)}s total, ${s.outputChars} output chars`);
  }
}

async function synthesize(question, results, env) {
  const blocks = results
    .filter(r => r.ok)
    .map(r => `--- ${r.provider.toUpperCase()} (${r.model}) ---\n${r.text}`)
    .join('\n\n');
  const prompt = `Multiple AI models answered the same question. Synthesize for the human director:\n1. CONSENSUS — points most/all agree on (terse bullets).\n2. DISAGREEMENTS — where they diverge, who says what, and which position looks stronger.\n3. UNIQUE — any insight only one model surfaced that deserves attention.\nNo preamble.\n\nQUESTION: ${question}\n\nANSWERS:\n${blocks}`;
  return SEATS.gemini(prompt, env, { timeoutMs: 120_000 });
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'ledger') {
    printLedger(Number(argv[1]) || 20);
    return;
  }

  const args = parseArgs(argv);
  if (!args.question) {
    console.error('Usage: council.js "Question..." [--to codex,gemini,deepseek,cerebras,groq] [--tag purpose] [--synth] [--timeout 180]');
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
  const opts = { timeoutMs: args.timeoutS * 1000 };
  console.log(`[council] dispatching to ${args.to.join(', ')} …`);

  const results = await Promise.all(args.to.map(seat => SEATS[seat](args.question, env, opts)));

  const entries = results.map(r => buildEntry(r, { tag: args.tag, promptChars: args.question.length }));
  for (const r of results) {
    console.log(`\n===== ${r.provider.toUpperCase()} (${r.model}, ${(r.ms / 1000).toFixed(1)}s) =====`);
    console.log(r.ok ? r.text : `[FAILED: ${r.error}]`);
  }

  if (args.synth) {
    const synth = await synthesize(args.question, results, env);
    entries.push(buildEntry(synth, { tag: `${args.tag}#synth`, promptChars: args.question.length }));
    console.log(`\n===== SYNTHESIS (${synth.model}) =====`);
    console.log(synth.ok ? synth.text : `[FAILED: ${synth.error}]`);
  }

  appendEntries(entries);
  const okCount = results.filter(r => r.ok).length;
  console.log(`\n[council] ${okCount}/${results.length} seats answered · ledger: ${DEFAULT_LEDGER}`);
}

main().catch(err => {
  console.error(`[council] fatal: ${err.message}`);
  process.exitCode = 1;
});
